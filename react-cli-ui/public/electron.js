// This file is a bridge to the actual main.js file
// It's needed because electron-builder expects the entry point to be in build/electron.js
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const os = require('os');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');

// Function to initialize CDP connection with retry and fallback mechanism
async function initializeCDP(port = 9222, maxRetries = 3, initialDelay = 1000) {
  console.log('Initializing CDP connection...');
  
  let retryCount = 0;
  let delay = initialDelay;
  
  while (retryCount < maxRetries) {
    try {
      // Try to get the hostname
      let hostname;
      try {
        hostname = os.hostname();
        console.log(`Got system hostname: ${hostname}`);
      } catch (hostnameError) {
        console.error(`Error getting hostname: ${hostnameError.message}`);
        hostname = 'localhost';
        console.log(`Falling back to default hostname: ${hostname}`);
      }
      
      // Define the endpoints to try
      const endpoints = [
        { url: `http://${hostname}:${port}/json/list`, name: 'hostname list' },
        { url: `http://localhost:${port}/json/list`, name: 'localhost list' },
        { url: `http://${hostname}:${port}/json/version`, name: 'hostname version' },
        { url: `http://localhost:${port}/json/version`, name: 'localhost version' }
      ];
      
      // Try each endpoint
      for (const endpoint of endpoints) {
        try {
          console.log(`Attempting to connect to CDP at ${endpoint.url}`);
          const response = await axios.get(endpoint.url, { timeout: 5000 });
          
          if (response.status === 200) {
            console.log(`Successfully connected to CDP using ${endpoint.name}: ${endpoint.url}`);
            
            // Validate the response
            if (response.data) {
              if (Array.isArray(response.data)) {
                console.log(`Found ${response.data.length} browser targets`);
                if (response.data.length > 0) {
                  return { success: true, url: endpoint.url, data: response.data };
                } else {
                  console.log('No browser targets found, but connection successful');
                }
              } else if (typeof response.data === 'object') {
                console.log('Connected to browser version endpoint');
                return { success: true, url: endpoint.url, data: response.data };
              }
            }
          }
        } catch (endpointError) {
          console.error(`Failed to connect to ${endpoint.name}: ${endpointError.message}`);
        }
      }
      
      // If we get here, none of the endpoints worked
      console.log(`Retry ${retryCount + 1}/${maxRetries} failed. Waiting ${delay}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
      retryCount++;
      
    } catch (error) {
      console.error(`Unexpected error during CDP initialization: ${error.message}`);
      retryCount++;
      if (retryCount < maxRetries) {
        console.log(`Waiting ${delay}ms before retry ${retryCount + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
  
  console.error(`Failed to connect to CDP after ${maxRetries} retries`);
  return { success: false, error: 'Failed to connect to CDP after multiple attempts' };
}

// Function to start Chrome with debugging enabled
async function startChromeWithDebugging(chromePath, debugPort = 9222) {
  if (!chromePath) {
    console.error('Chrome path not provided');
    return { success: false, error: 'Chrome path not provided' };
  }
  
  try {
    console.log(`Starting Chrome at ${chromePath} with remote debugging on port ${debugPort}`);
    
    const chromeProcess = spawn(chromePath, [
      `--remote-debugging-port=${debugPort}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--user-data-dir=./ChromeUserData'
    ], {
      detached: true,
      stdio: 'ignore'
    });
    
    // Don't wait for the process to exit
    chromeProcess.unref();
    
    // Give Chrome time to start
    console.log('Waiting for Chrome to initialize...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to connect to CDP
    const cdpResult = await initializeCDP(debugPort);
    if (cdpResult.success) {
      return { success: true, process: chromeProcess, cdpUrl: cdpResult.url };
    } else {
      return { success: false, error: 'Failed to connect to Chrome after starting it' };
    }
    
  } catch (error) {
    console.error(`Error starting Chrome: ${error.message}`);
    return { success: false, error: `Error starting Chrome: ${error.message}` };
  }
}

// Import the actual main.js file
require(path.join(__dirname, '../main.js'));

// Export the CDP initialization functions for use in main.js
module.exports = {
  initializeCDP,
  startChromeWithDebugging
};
