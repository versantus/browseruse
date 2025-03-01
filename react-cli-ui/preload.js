// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron', {
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
    setBackendConfig: (config) => ipcRenderer.invoke('set-backend-config', config),
    selectChromePath: () => ipcRenderer.invoke('select-chrome-path')
  }
);
