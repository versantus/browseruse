const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');

// Keep a global reference of the window object to avoid garbage collection
let mainWindow;

// Keep a reference to the Express server process
let serverProcess = null;

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

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

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
ipcMain.handle('set-backend-config', (event, config) => {
  // Store the backend configuration for later use
  global.backendConfig = config;
  return true;
});

// Handle selecting Chrome path
ipcMain.handle('select-chrome-path', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Executables', extensions: ['exe', '*'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});
