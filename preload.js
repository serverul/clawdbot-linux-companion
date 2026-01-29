const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clawdbot', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  fetchStatus: () => ipcRenderer.invoke('fetch-status'),
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  sendQuickAction: (actionName) => ipcRenderer.invoke('send-quick-action', actionName)
});
