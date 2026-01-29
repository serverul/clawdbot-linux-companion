const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron');
const path = require('path');
const Store = require('electron-store');
const WebSocket = require('ws');
const http = require('http');

const store = new Store();

const DEFAULT_CONFIG = {
  gatewayUrl: 'http://localhost:18789',
  apiUrl: 'http://10.10.2.121:4000',
  wsUrl: 'ws://10.10.2.121:4001',
  apiSecret: 'clawdbot-secret-2026',
  theme: 'dark',
  startMinimized: true,
  notifications: true,
  autoConnect: true,
  quickActions: [
    { name: 'Status', message: 'status' },
    { name: 'Sessions', message: 'sessions list' },
    { name: 'Health', message: 'health' }
  ]
};

if (!store.has('config')) {
  store.set('config', DEFAULT_CONFIG);
}

const config = store.get('config');

let mainWindow;
let tray = null;
let isQuitting = false;
let ws = null;
let wsReconnectTimeout = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
   650,
    frame: false,
    transparent: false,
    resizable: false,
    maximizable: false,
    minimizable: true,
    alwaysOnTop: config.startMinimized,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
  
  if (config.startMinimized) {
    mainWindow.hide();
  }

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  tray = new Tray(nativeImage.createEmpty());
  tray.setToolTip('Clawdbot Companion');
  
  const contextMenu = Menu.buildFromTemplate([
    { label: '📱 Deschide', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: '💬 Trimite Mesaj', click: () => mainWindow.webContents.send('show-chat') },
    { 
      label: '📡 Conexiune', 
      submenu: [
        { label: `HTTP: ${config.apiUrl}`, enabled: false },
        { label: `WS: ${config.wsUrl}`, enabled: false },
        { type: 'separator' },
        { label: '🔄 Reconectează', click: () => connectWebSocket() }
      ]
    },
    { type: 'separator' },
    { label: '⚙️ Setări', click: () => mainWindow.webContents.send('show-settings') },
    { type: 'separator' },
    { label: '❌ Ieșire', click: () => { isQuitting = true; app.quit(); } }
  ]);

  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
  
  tray.on('double-click', () => mainWindow.show());
}

function showNotification(title, body) {
  const { Notification } = require('electron');
  if (Notification.isSupported() && config.notifications) {
    new Notification({ title, body }).show();
  }
}

function connectWebSocket() {
  if (ws) {
    ws.close();
  }
  
  try {
    ws = new WebSocket(config.wsUrl);
    
    ws.on('open', () => {
      console.log('📡 WebSocket conectat');
      // Autentificare
      ws.send(JSON.stringify({ type: 'auth', secret: config.apiSecret }));
    });
    
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        if (msg.type === 'auth' && msg.success) {
          mainWindow.webContents.send('ws-status', 'Conectat');
          showNotification('Clawdbot', 'Conectat la WebSocket!');
        }
        
        if (msg.type === 'new_message') {
          mainWindow.webContents.send('new-message', msg);
          showNotification('Mesaj nou', msg.content?.substring(0, 50));
        }
        
        if (msg.type === 'chat_response') {
          mainWindow.webContents.send('chat-response', msg);
        }
        
        if (msg.type === 'status') {
          mainWindow.webContents.send('system-status', msg);
        }
        
      } catch (err) {
        console.log('WS message error:', err);
      }
    });
    
    ws.on('close', () => {
      console.log('📡 WebSocket deconectat');
      mainWindow.webContents.send('ws-status', 'Deconectat');
      // Reconectare automată
      wsReconnectTimeout = setTimeout(connectWebSocket, 5000);
    });
    
    ws.on('error', (err) => {
      console.log('WebSocket error:', err.message);
      mainWindow.webContents.send('ws-status', 'Eroare');
    });
    
  } catch (err) {
    console.log('WS connection error:', err.message);
  }
}

// IPC Handlers
ipcMain.handle('get-config', () => store.get('config'));
ipcMain.handle('save-config', (event, newConfig) => {
  store.set('config', { ...config, ...newConfig });
  return store.get('config');
});
ipcMain.handle('fetch-status', async () => {
  try {
    const response = await fetch(`${config.apiUrl}/status`, {
      headers: { 'X-API-Secret': config.apiSecret }
    });
    return await response.json();
  } catch (err) {
    return { error: err.message };
  }
});
ipcMain.handle('send-message', async (event, message) => {
  try {
    const response = await fetch(`${config.apiUrl}/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-Secret': config.apiSecret
      },
      body: JSON.stringify({ message })
    });
    return await response.json();
  } catch (err) {
    return { error: err.message };
  }
});
ipcMain.handle('get-messages', async () => {
  try {
    const response = await fetch(`${config.apiUrl}/messages`, {
      headers: { 'X-API-Secret': config.apiSecret }
    });
    return await response.json();
  } catch (err) {
    return { error: err.message };
  }
});
ipcMain.handle('connect-ws', () => connectWebSocket());

app.whenReady().then(() => {
  createWindow();
  createTray();
  
  if (config.autoConnect) {
    setTimeout(connectWebSocket, 1000);
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
  if (wsReconnectTimeout) clearTimeout(wsReconnectTimeout);
  if (ws) ws.close();
});
