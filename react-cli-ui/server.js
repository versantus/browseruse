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
    
    // Get the list of available targets (pages)
    const response = await axios.get(`http://${hostname}:${port}/json/list`);
    const targets = response.data;
    
    if (targets && targets.length > 0) {
      // Find the first page target
      const target = targets.find(t => t.type === 'page');
      if (target) {
        console.log('Found browser target:', target.title);
        
        // Create a WebSocket connection to the target
        const ws = new WebSocket(target.webSocketDebuggerUrl);
        
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
    chromePath,
    wssUrl,
    cdpUrl,
    extraChromiumArgs,
    proxy
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
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
  
  // Add extra chromium args if provided
  if (extraChromiumArgs && extraChromiumArgs.length > 0) {
    extraChromiumArgs.forEach(arg => {
      args.push('--chromium-arg', arg);
    });
  }
  
  // If using embedded browser, add a special flag
  if (req.body.useEmbeddedBrowser) {
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

  console.log('Running command: python3', args.join(' '));
  
  // Send initial CLI output to clients
  broadcastCliOutput(`Starting research: "${prompt}"`);
  broadcastCliOutput(`Command: python3 ${args.join(' ')}`);
  
  // Spawn the Python process
  const pythonProcess = spawn('python3', args);
  
  let dataOutput = '';
  let errorOutput = '';
  
  // If using embedded browser, try to connect to CDP
  if (req.body.useEmbeddedBrowser) {
    // Wait a moment for the browser to start
    setTimeout(async () => {
      try {
        // This will start the screenshot capture process
        await connectToCDP(9222);
        broadcastCliOutput("Connected to browser for screenshots");
        
        // If we're running in headless mode on a server, let the user know
        if (process.env.SERVER_ENVIRONMENT === 'true') {
          broadcastCliOutput("Running in headless mode on server. Screenshots will be captured and displayed.");
        }
      } catch (error) {
        console.error('Error connecting to browser:', error);
        broadcastCliOutput(`Error connecting to browser: ${error.message}`);
        
        // If we're running on a server, provide additional troubleshooting info
        if (process.env.SERVER_ENVIRONMENT === 'true') {
          broadcastCliOutput("Note: When running on a Linux server without a display, the browser runs in headless mode.");
          broadcastCliOutput("Screenshots should still be captured and displayed in the iframe.");
          broadcastCliOutput("If no screenshots appear, check that the browser is properly initialized with --headless=new flag.");
        }
      }
    }, 3000); // Wait 3 seconds for the browser to initialize
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
