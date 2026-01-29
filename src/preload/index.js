/**
 * Clawdbot Companion - Preload Script
 * Bridges renderer and main processes securely
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected API to renderer
contextBridge.exposeInMainWorld(
  'clawdbot', // Application namespace
  {
    // App state
    getAppState: () => ipcRenderer.invoke('get-app-state'),
    getConnectionMode: () => ipcRenderer.invoke('get-connection-mode'),
    testConnection: () => ipcRenderer.invoke('test-connection'),
    getStatus: () => ipcRenderer.invoke('get-status'),
    getSessions: () => ipcRenderer.invoke('get-sessions'),
    getMessages: (limit) => ipcRenderer.invoke('get-messages', limit),
    sendMessage: (message, target) => ipcRenderer.invoke('send-message', message, target),
    saveConfig: (config) => ipcRenderer.invoke('save-config', config),
    markOnboardingSeen: () => ipcRenderer.invoke('mark-onboarding-seen'),
    isFirstRun: () => ipcRenderer.invoke('is-first-run'),
    
    // Config
    saveConfig: (config) => ipcRenderer.invoke('save-config', config),
    
    // Window controls
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    closeWindow: () => ipcRenderer.invoke('close-window'),
    
    // Platform info
    getSystemInfo: () => ipcRenderer.invoke('get-system-info')
  }
);

console.log('Clawdbot Companion preload loaded');
