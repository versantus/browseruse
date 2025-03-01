const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'build')));

// API endpoint to run the CLI script
app.post('/api/run-research', (req, res) => {
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

  console.log('Running command: python3', args.join(' '));
  
  // Spawn the Python process
  const pythonProcess = spawn('python3', args);
  
  let dataOutput = '';
  let errorOutput = '';

  // Collect data from stdout
  pythonProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('Output:', output);
    dataOutput += output;
  });

  // Collect data from stderr
  pythonProcess.stderr.on('data', (data) => {
    const error = data.toString();
    console.error('Error:', error);
    errorOutput += error;
  });

  // Handle process completion
  pythonProcess.on('close', (code) => {
    console.log(`Process exited with code ${code}`);
    
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
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
