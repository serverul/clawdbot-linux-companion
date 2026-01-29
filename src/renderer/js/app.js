/**
 * Clawdbot Companion - Main Renderer JavaScript
 */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Clawdbot Companion starting...');
  
  // Check if first run
  const isFirstRun = await clawdbot.isFirstRun();
  console.log('First run:', isFirstRun);
  
  if (isFirstRun) {
    showOnboarding();
  } else {
    await initializeApp();
  }
  
  // Setup IPC listeners
  setupListeners();
});

async function initializeApp() {
  try {
    // Get connection mode
    const connectionMode = await clawdbot.getConnectionMode();
    console.log('Connection mode:', connectionMode);
    
    if (connectionMode === 'unconfigured') {
      showOnboarding();
      return;
    }
    
    // Show main interface
    showMainInterface();
    
    // Test connection
    const result = await clawdbot.testConnection();
    console.log('Connection test:', result);
    
    if (result.success) {
      updateConnectionStatus('connected');
      loadDashboard();
    } else {
      updateConnectionStatus('disconnected');
      showNotification('Connection failed', result.error || 'Could not connect to Clawdbot');
    }
  } catch (error) {
    console.error('Initialization error:', error);
    showNotification('Error', 'Failed to initialize application');
  }
}

function setupListeners() {
  // Connection state changes
  clawdbot.onConnectionStateChanged((state) => {
    console.log('Connection state changed:', state);
    updateConnectionStatus(state);
  });
  
  // Config changes
  clawdbot.onConfigChanged(() => {
    console.log('Config changed');
    refreshSettings();
  });
}

function showOnboarding() {
  document.getElementById('onboarding').style.display = 'flex';
  document.getElementById('main-interface').style.display = 'none';
  document.getElementById('settings-panel').style.display = 'none';
}

function showMainInterface() {
  document.getElementById('onboarding').style.display = 'none';
  document.getElementById('main-interface').style.display = 'block';
  document.getElementById('settings-panel').style.display = 'none';
}

function showSettings() {
  document.getElementById('main-interface').style.display = 'none';
  document.getElementById('settings-panel').style.display = 'block';
  refreshSettings();
}

function updateConnectionStatus(status) {
  const statusElement = document.getElementById('connection-status');
  const statusText = document.getElementById('status-text');
  
  if (statusElement && statusText) {
    statusElement.className = `status-indicator ${status}`;
    statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);
  }
}

async function loadDashboard() {
  try {
    // Load status
    const status = await clawdbot.getStatus();
    if (status) {
      updateStatusDisplay(status);
    }
    
    // Load sessions
    const sessions = await clawdbot.getSessions();
    updateSessionsList(sessions);
    
    // Load recent messages
    const messages = await clawdbot.getMessages(10);
    updateMessagesList(messages);
  } catch (error) {
    console.error('Dashboard load error:', error);
  }
}

function updateStatusDisplay(status) {
  const versionEl = document.getElementById('gateway-version');
  const uptimeEl = document.getElementById('gateway-uptime');
  
  if (versionEl && status.version) {
    versionEl.textContent = status.version;
  }
  if (uptimeEl && status.uptime) {
    uptimeEl.textContent = formatUptime(status.uptime);
  }
}

function updateSessionsList(sessions) {
  const listEl = document.getElementById('sessions-list');
  if (!listEl) return;
  
  if (!sessions || sessions.length === 0) {
    listEl.innerHTML = '<p class="empty-state">No active sessions</p>';
    return;
  }
  
  listEl.innerHTML = sessions.slice(0, 5).map(session => `
    <div class="session-item">
      <span class="session-name">${session.label || session.key || 'Unknown'}</span>
      <span class="session-status ${session.active ? 'active' : 'inactive'}">
        ${session.active ? 'Active' : 'Inactive'}
      </span>
    </div>
  `).join('');
}

function updateMessagesList(messages) {
  const listEl = document.getElementById('messages-list');
  if (!listEl) return;
  
  if (!messages || messages.length === 0) {
    listEl.innerHTML = '<p class="empty-state">No recent messages</p>';
    return;
  }
  
  listEl.innerHTML = messages.slice(0, 10).map(msg => `
    <div class="message-item ${msg.fromMe ? 'from-me' : ''}">
      <span class="message-text">${truncate(msg.content || msg.message || '', 50)}</span>
      <span class="message-time">${formatTime(msg.timestamp)}</span>
    </div>
  `).join('');
}

async function saveSettings() {
  const gatewayUrl = document.getElementById('gateway-url').value;
  const apiSecret = document.getElementById('api-secret').value;
  const notifications = document.getElementById('notifications').checked;
  const autoConnect = document.getElementById('auto-connect').checked;
  
  await clawdbot.saveConfig({
    gatewayUrl,
    apiSecret,
    notifications,
    autoConnect
  });
  
  await clawdbot.markOnboardingSeen();
  
  showMainInterface();
  await initializeApp();
}

async function sendQuickMessage() {
  const input = document.getElementById('quick-message-input');
  const message = input.value.trim();
  
  if (!message) return;
  
  const result = await clawdbot.sendMessage(message);
  
  if (result.success) {
    input.value = '';
    loadDashboard();
    showNotification('Message sent', 'Your message was sent successfully');
  } else {
    showNotification('Error', result.error || 'Failed to send message');
  }
}

function refreshSettings() {
  clawdbot.getAppState().then(state => {
    if (state) {
      const urlEl = document.getElementById('gateway-url');
      const secretEl = document.getElementById('api-secret');
      const notifEl = document.getElementById('notifications');
      const autoEl = document.getElementById('auto-connect');
      
      if (urlEl) urlEl.value = state.gatewayUrl || '';
      if (secretEl) secretEl.value = state.apiSecret || '';
      if (notifEl) notifEl.checked = state.settings?.notifications !== false;
      if (autoEl) autoEl.checked = state.settings?.autoConnect === true;
    }
  });
}

function showNotification(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

// Utility functions
function formatUptime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function truncate(str, length) {
  if (!str) return '';
  return str.length > length ? str.slice(0, length) + '...' : str;
}

// Quick action handlers
function showChat() {
  document.getElementById('main-interface').style.display = 'block';
  document.getElementById('chat-panel').style.display = 'block';
  document.getElementById('status-panel').style.display = 'none';
}

function showStatus() {
  document.getElementById('chat-panel').style.display = 'none';
  document.getElementById('status-panel').style.display = 'block';
}

// Initialize notification permission
if ('Notification' in window) {
  Notification.requestPermission();
}
