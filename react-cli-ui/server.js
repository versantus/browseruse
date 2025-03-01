const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const http = require('http');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3002;

// Check if running in Electron
const isElectron = process.env.ELECTRON_RUN_AS_NODE || process.versions.electron;

// Store WebSocket connections
const clients = new Set();

// Function to broadcast CLI output to all connected clients
function broadcastCliOutput(text) {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'cli-output',
        data: text
      }));
    }
  });
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'build')));

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  clients.add(ws);
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clients.delete(ws);
  });
});

// Function to connect to Chrome DevTools Protocol and capture screenshots
async function connectToCDP(port = 9222) {
  try {
    // Get the hostname dynamically
    const hostname = require('os').hostname();
    
    console.log(`Attempting to connect to CDP at http://${hostname}:${port}/json/list`);
    
    let response;
    let targets;
    
    try {
      // Try connecting using the hostname
      response = await axios.get(`http://${hostname}:${port}/json/list`);
      targets = response.data;
      console.log(`Successfully connected to CDP using hostname: ${hostname}`);
    } catch (error) {
      console.log(`Failed to connect using hostname: ${hostname}. Error: ${error.message}`);
      console.log(`Trying fallback to localhost...`);
      
      // If that fails, try connecting to localhost
      response = await axios.get(`http://localhost:${port}/json/list`);
      targets = response.data;
      console.log(`Successfully connected to CDP using localhost fallback`);
    }
    
    console.log(`Found ${targets.length} browser targets`);
    
    if (targets && targets.length > 0) {
      // Log all targets for debugging
      targets.forEach((t, i) => {
        console.log(`Target ${i}: type=${t.type}, title=${t.title}, url=${t.url}`);
      });
      
      // First try to find a target that's not about:blank or chrome:// URL
      let target = targets.find(t => t.type === 'page' && !t.url.startsWith('about:') && !t.url.startsWith('chrome://'));
      
      // If no suitable target found, fall back to any page target
      if (!target) {
        target = targets.find(t => t.type === 'page');
      }
      
      // If still no target, use any target as a last resort
      if (!target && targets.length > 0) {
        console.log('No page target found, using first available target as fallback');
        target = targets[0];
      }
      
      if (target) {
        console.log('Found browser target:', target.title);
        
        // Create a WebSocket connection to the target
        console.log('Connecting to WebSocket URL:', target.webSocketDebuggerUrl);
        const ws = new WebSocket(target.webSocketDebuggerUrl);
        
        // Add error handler for WebSocket connection
        ws.on('error', (error) => {
          console.error('WebSocket connection error:', error.message);
          broadcastCliOutput(`WebSocket connection error: ${error.message}`);
        });
        
        // Set up message handler
        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message.toString());
            
            // If this is a screenshot response
            if (data.id === 1 && data.result && data.result.data) {
              // Broadcast the screenshot to all connected clients
              clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'screenshot',
                    data: data.result.data
                  }));
                }
              });
            }
          } catch (error) {
            console.error('Error processing CDP message:', error);
          }
        });
        
        // When the connection is established
        ws.on('open', () => {
          console.log('Connected to Chrome target');
          broadcastCliOutput('Connected to Chrome target for screenshots');
          
          // Start capturing screenshots periodically
          const captureInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                id: 1,
                method: 'Page.captureScreenshot',
                params: { format: 'jpeg', quality: 80 }
              }));
            } else {
              clearInterval(captureInterval);
            }
          }, 500); // Capture every 500ms
        });
        
        return target.webSocketDebuggerUrl;
      }
    }
    throw new Error('No browser targets found');
  } catch (error) {
    console.error('Error connecting to CDP:', error.message);
    return null;
  }
}

// Endpoint for the embedded browser
app.get('/embedded-browser', (req, res) => {
  // Serve a simple HTML page that will be embedded in the iframe
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Embedded Browser</title>
      <style>
        body, html {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background-color: #f0f0f0;
        }
        #browser-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        #browser-display {
          max-width: 100%;
          max-height: 100%;
          border: 1px solid #ccc;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          background-color: white;
        }
        .initializing {
          text-align: center;
          font-family: Arial, sans-serif;
          color: #333;
        }
      </style>
    </head>
    <body>
      <div id="browser-container">
        <div class="initializing">
          <h2>Browser is initializing...</h2>
          <p>Please wait while the browser loads...</p>
        </div>
      </div>
      <script>
        // Create a WebSocket connection to the server
        const socket = new WebSocket('ws://' + window.location.host);
        
        socket.onopen = function() {
          console.log('WebSocket connection established');
        };
        
        socket.onmessage = function(event) {
          const data = JSON.parse(event.data);
          
          if (data.type === 'screenshot') {
            // When we receive a screenshot, display it
            const container = document.getElementById('browser-container');
            
            // If this is the first screenshot, clear the initializing message
            if (!document.getElementById('browser-display')) {
              container.innerHTML = '<img id="browser-display" src="" alt="Browser content" />';
            }
            
            // Update the screenshot
            const img = document.getElementById('browser-display');
            img.src = 'data:image/jpeg;base64,' + data.data;
          }
          else if (data.type === 'cli-output') {
            // Forward CLI output to parent window
            window.parent.postMessage({
              type: 'cli-output',
              data: data.data
            }, '*');
          }
        };
        
        socket.onclose = function() {
          console.log('WebSocket connection closed');
        };
        
        // Notify the parent window that the iframe is ready
        window.parent.postMessage({ type: 'iframe-ready' }, '*');
      </script>
    </body>
    </html>
  `;
  
  res.send(html);
});

// API endpoint to run the CLI script
app.post('/api/run-research', async (req, res) => {
  const {
    prompt,
    noHeadless,
    enableSecurity,
    connectExisting,
    useLocalBrowser,
    chromePath,
    wssUrl,
    cdpUrl,
    extraChromiumArgs,
    proxy,
    noStealthMode,
    useRemoteBackend,
    remoteBackendUrl
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  
  // If using remote backend, forward the request
  if (useRemoteBackend && remoteBackendUrl) {
    try {
      broadcastCliOutput(`Using remote backend at: ${remoteBackendUrl}`);
      
      // Forward the request to the remote backend
      const response = await axios.post(`${remoteBackendUrl}/api/run-research`, req.body);
      
      // Return the response from the remote backend
      return res.json(response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Error connecting to remote backend';
      broadcastCliOutput(`ERROR: ${errorMsg}`);
      return res.status(500).json({ error: errorMsg });
    }
  }

  // Build the command arguments
  const args = ['../cli.py'];
  
  // Add the prompt (quoted to handle spaces and special characters)
  args.push(prompt);
  
  // Add optional flags
  if (noHeadless) args.push('--no-headless');
  if (enableSecurity) args.push('--enable-security');
  if (connectExisting) args.push('--connect-existing');
  if (chromePath) args.push('--chrome-path', chromePath);
  if (wssUrl) args.push('--wss-url', wssUrl);
  if (cdpUrl) args.push('--cdp-url', cdpUrl);
  if (proxy) args.push('--proxy', proxy);
  if (noStealthMode) args.push('--no-stealth-mode');
  
  // Add extra chromium args if provided
  if (extraChromiumArgs && extraChromiumArgs.length > 0) {
    extraChromiumArgs.forEach(arg => {
      args.push('--chromium-arg', arg);
    });
  }
  
  // If using embedded browser and not using local browser, add a special flag
  if (req.body.useEmbeddedBrowser && !useLocalBrowser) {
    args.push('--embedded-browser');
    
    // Add additional arguments for embedded browser as a single string
    if (!extraChromiumArgs || !extraChromiumArgs.some(arg => arg.includes('remote-debugging-port'))) {
      args.push('--chromium-arg=--remote-debugging-port=9222');
    }
    
    if (!extraChromiumArgs || !extraChromiumArgs.some(arg => arg === '--no-sandbox')) {
      args.push('--chromium-arg=--no-sandbox');
    }
    
    // Set SERVER_ENVIRONMENT to true if running on a server without a display
    // This will force headless mode in cli.py
    const isServer = process.env.NODE_ENV === 'production' || 
                    !process.env.DISPLAY || 
                    process.env.SERVER_ENVIRONMENT === 'true';
                    
    if (isServer) {
      process.env.SERVER_ENVIRONMENT = 'true';
    }
  }
  
  // If using local browser, set connect-existing to true and add necessary flags
  if (useLocalBrowser) {
    args.push('--connect-existing');
    
    // If chrome path is not provided, try to use a default path based on OS
    let defaultChromePath = '';
    if (!chromePath) {
      const platform = process.platform;
      
      if (platform === 'darwin') {
        // macOS
        defaultChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      } else if (platform === 'win32') {
        // Windows
        defaultChromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      } else if (platform === 'linux') {
        // Linux
        defaultChromePath = '/usr/bin/google-chrome';
      }
      
      if (defaultChromePath) {
        args.push('--chrome-path', defaultChromePath);
      }
    }
    
    // Add remote debugging port if not already specified
    if (!extraChromiumArgs || !extraChromiumArgs.some(arg => arg.includes('remote-debugging-port'))) {
      args.push('--chromium-arg=--remote-debugging-port=9222');
    }
    
    // When using local browser, we need to start Chrome with remote debugging enabled
    // before running the Python script
    const actualChromePath = chromePath || defaultChromePath;
    if (actualChromePath && !args.includes('--connect-existing')) {
      try {
        broadcastCliOutput(`Chrome path detected: ${actualChromePath}`);
        broadcastCliOutput(`Letting cli.py handle Chrome startup with --connect-existing flag`);
        
        // Add connect-existing flag to let cli.py handle Chrome startup
        args.push('--connect-existing');
        
        // Log the Chrome path for debugging
        broadcastCliOutput(`Chrome path: ${actualChromePath}`);
        
        // Check if the Chrome executable exists
        if (!fs.existsSync(actualChromePath)) {
          broadcastCliOutput(`WARNING: Chrome executable not found at ${actualChromePath}`);
          broadcastCliOutput(`Checking for Chrome in other common locations...`);
          
          // Try some alternative locations
          const alternativePaths = [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            '/usr/bin/google-chrome',
            '/usr/bin/chromium-browser'
          ];
          
          let found = false;
          let foundPath = '';
          
          for (const path of alternativePaths) {
            if (fs.existsSync(path)) {
              broadcastCliOutput(`Found Chrome at: ${path}`);
              foundPath = path;
              found = true;
              break;
            }
          }
          
          if (!found) {
            broadcastCliOutput(`WARNING: Could not find Chrome in any common location. cli.py will attempt to find it.`);
          } else {
            // Use the found path
            actualChromePath = foundPath;
            // Update the chrome path in args
            const chromePathIndex = args.indexOf('--chrome-path') + 1;
            if (chromePathIndex > 0 && chromePathIndex < args.length) {
              args[chromePathIndex] = actualChromePath;
            } else {
              args.push('--chrome-path', actualChromePath);
            }
          }
        }
      } catch (error) {
        console.error('Error configuring Chrome path:', error);
        broadcastCliOutput(`Error configuring Chrome path: ${error.message}`);
      }
    }
  }

  console.log('Running command: python3', args.join(' '));
  
  // Send initial CLI output to clients
  broadcastCliOutput(`Starting research: "${prompt}"`);
  broadcastCliOutput(`Command: python3 ${args.join(' ')}`);
  
  // Spawn the Python process
  const pythonProcess = spawn('python3', args);
  
  let dataOutput = '';
  let errorOutput = '';
  
  // Always try to connect to CDP for screenshots, whether using embedded or local browser
  if (req.body.useEmbeddedBrowser || useLocalBrowser) {
    // Wait longer for the Python process to start the browser
    const waitTime = useLocalBrowser ? 15000 : 12000;
    broadcastCliOutput(`Waiting ${waitTime/1000} seconds for browser to initialize...`);
    
    setTimeout(async () => {
      // For local browser, we need to wait longer and retry a few times
      const maxRetries = useLocalBrowser ? 10 : 5;
      let retryCount = 0;
      let connected = false;
      
      while (retryCount < maxRetries && !connected) {
        try {
          // This will start the screenshot capture process
          broadcastCliOutput(`Connecting to browser for screenshots (attempt ${retryCount + 1}/${maxRetries})...`);
          await connectToCDP(9222);
          broadcastCliOutput("Connected to browser for screenshots");
          connected = true;
          
          // If we're running in headless mode on a server, let the user know
          if (process.env.SERVER_ENVIRONMENT === 'true') {
            broadcastCliOutput("Running in headless mode on server. Screenshots will be captured and displayed.");
          } else if (useLocalBrowser) {
            broadcastCliOutput("Connected to local browser. Screenshots will be captured and displayed in the iframe.");
          }
        } catch (error) {
          console.error(`Error connecting to browser (attempt ${retryCount + 1}/${maxRetries}):`, error);
          broadcastCliOutput(`Error connecting to browser: ${error.message}`);
          
          if (retryCount < maxRetries - 1) {
            broadcastCliOutput(`Retrying in 3 seconds...`);
            // Wait 3 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
          retryCount++;
        }
      }
      
      if (!connected) {
        broadcastCliOutput("Failed to connect to browser after multiple attempts.");
        
        // If we're running on a server, provide additional troubleshooting info
        if (process.env.SERVER_ENVIRONMENT === 'true') {
          broadcastCliOutput("Note: When running on a Linux server without a display, the browser runs in headless mode.");
          broadcastCliOutput("Screenshots should still be captured and displayed in the iframe.");
          broadcastCliOutput("If no screenshots appear, check that the browser is properly initialized with --headless=new flag.");
        } else if (useLocalBrowser) {
          broadcastCliOutput("Make sure Chrome is running with remote debugging enabled on port 9222.");
          broadcastCliOutput("You can manually start Chrome with: chrome --remote-debugging-port=9222");
        }
      }
    }, waitTime); // Use the waitTime we defined earlier
  }

  // Collect data from stdout
  pythonProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('Output:', output);
    dataOutput += output;
    
    // Broadcast the output to all connected clients
    broadcastCliOutput(output);
  });

  // Collect data from stderr
  pythonProcess.stderr.on('data', (data) => {
    const error = data.toString();
    console.error('Error:', error);
    errorOutput += error;
    
    // Broadcast the error to all connected clients
    broadcastCliOutput(`ERROR: ${error}`);
  });

  // Handle process completion
  pythonProcess.on('close', (code) => {
    console.log(`Process exited with code ${code}`);
    
    // Broadcast process completion
    broadcastCliOutput(`Process completed with exit code: ${code}`);
    
    if (code === 0) {
      res.json({ 
        success: true, 
        output: dataOutput 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: errorOutput || 'An error occurred while running the script' 
      });
    }
  });

  // Handle process errors
  pythonProcess.on('error', (err) => {
    console.error('Failed to start process:', err);
    
    // Broadcast process error
    broadcastCliOutput(`Failed to start process: ${err.message}`);
    
    res.status(500).json({ 
      success: false, 
      error: `Failed to start process: ${err.message}` 
    });
  });
});

// Serve the React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
});
