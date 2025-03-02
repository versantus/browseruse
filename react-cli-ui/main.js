const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const axios = require('axios');

// Import CDP initialization functions from electron.js
let cdpFunctions;
try {
  cdpFunctions = require('./public/electron.js');
} catch (error) {
  console.error('Failed to import CDP functions from electron.js:', error.message);
  cdpFunctions = {
    initializeCDP: async () => ({ success: false, error: 'CDP functions not available' }),
    startChromeWithDebugging: async () => ({ success: false, error: 'CDP functions not available' })
  };
}

// Keep a global reference of the window object to avoid garbage collection
let mainWindow;

// Keep a reference to the Express server process
let serverProcess = null;

// Keep a reference to the Chrome process
let chromeProcess = null;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Start the Express server
  startServer();

  // Load the app
  const startUrl = process.env.ELECTRON_START_URL || url.format({
    pathname: 'localhost:3002',
    protocol: 'http:',
    slashes: true
  });

  mainWindow.loadURL(startUrl);

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close
  mainWindow.on('closed', function() {
    mainWindow = null;
    stopServer();
  });
}

function startServer() {
  console.log('Starting Express server...');
  
  // Start the server as a child process
  serverProcess = spawn('node', ['server.js'], {
    stdio: 'inherit'
  });
  
  serverProcess.on('error', (err) => {
    console.error('Failed to start server process:', err);
  });
  
  console.log('Express server started');
}

function stopServer() {
  if (serverProcess) {
    console.log('Stopping Express server...');
    serverProcess.kill();
    serverProcess = null;
  }
}

// Check if required global packages are installed
function checkGlobalPackages() {
  console.log('Checking for required global packages...');
  
  const requiredPackages = ['cross-env', 'wait-on'];
  const missingPackages = [];
  
  requiredPackages.forEach(pkg => {
    try {
      execSync(`npm list -g ${pkg} --depth=0`, { stdio: 'ignore' });
    } catch (error) {
      missingPackages.push(pkg);
    }
  });
  
  if (missingPackages.length > 0) {
    const message = `The following required global packages are missing:\n${missingPackages.join(', ')}\n\nPlease install them using:\nnpm install -g ${missingPackages.join(' ')}\n\nThen try running the application again.`;
    dialog.showErrorBox('Missing Dependencies', message);
    return false;
  }
  
  return true;
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  if (checkGlobalPackages()) {
    createWindow();
  } else {
    app.quit();
  }
});

// Quit when all windows are closed
app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') {
    stopServer();
    app.quit();
  }
});

app.on('activate', function() {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for communication between renderer and main process
ipcMain.handle('get-app-path', () => {
  return app.getAppPath();
});

// Handle backend configuration
ipcMain.handle('set-backend-config', async (event, config) => {
  try {
    // Store the backend configuration for later use
    global.backendConfig = config;
    
    // If connecting to existing Chrome and we have a Chrome path, try to start it
    if (config.connectExisting && config.chromePath) {
      // Stop any existing Chrome process
      if (chromeProcess) {
        try {
          chromeProcess.kill();
        } catch (error) {
          console.error('Error stopping existing Chrome process:', error.message);
        }
        chromeProcess = null;
      }
      
      // Start Chrome with debugging enabled
      const result = await cdpFunctions.startChromeWithDebugging(config.chromePath, 9222);
      if (result.success) {
        chromeProcess = result.process;
        console.log('Chrome started successfully with CDP URL:', result.cdpUrl);
        
        // Update the CDP URL in the config
        global.backendConfig.cdpUrl = result.cdpUrl;
        
        return { success: true, cdpUrl: result.cdpUrl };
      } else {
        console.error('Failed to start Chrome:', result.error);
        return { success: false, error: result.error };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error setting backend config:', error.message);
    return { success: false, error: error.message };
  }
});

// Handle selecting Chrome path
ipcMain.handle('select-chrome-path', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Executables', extensions: ['exe', '*'] }
      ],
      title: 'Select Chrome Executable'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const chromePath = result.filePaths[0];
      
      // Verify that the selected file exists
      if (fs.existsSync(chromePath)) {
        console.log('Selected Chrome path:', chromePath);
        return chromePath;
      } else {
        console.error('Selected Chrome path does not exist:', chromePath);
        dialog.showErrorBox('Invalid Chrome Path', 'The selected Chrome executable does not exist.');
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('Error selecting Chrome path:', error.message);
    dialog.showErrorBox('Error', `Failed to select Chrome path: ${error.message}`);
    return null;
  }
});

// Handle testing CDP connection
ipcMain.handle('test-cdp-connection', async (event, port = 9222) => {
  try {
    console.log('Testing CDP connection on port:', port);
    const result = await cdpFunctions.initializeCDP(port);
    return result;
  } catch (error) {
    console.error('Error testing CDP connection:', error.message);
    return { success: false, error: error.message };
  }
});
