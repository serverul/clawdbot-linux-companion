/**
 * AppState.js - Centralized application state management
 * Adapted for Linux Companion from Mac Companion Swift version
 */

const { EventEmitter } = require('events');
const Store = require('electron-store');
const path = require('path');
const os = require('os');

class AppState extends EventEmitter {
  constructor() {
    super();
    
    // Initialize store
    this.store = new Store({
      name: 'clawdbot-companion',
      cwd: path.join(process.env.HOME || process.env.USERPROFILE, '.clawdbot')
    });
    
    // Default configuration
    this.defaults = {
      gatewayUrl: 'http://localhost:3000',
      apiUrl: 'http://localhost:3000/api',
      apiSecret: '',
      notifications: true,
      autoConnect: false,
      startMinimized: false,
      theme: 'dark',
      connectionMode: 'local',
      onboardingSeen: false
    };
    
    // Initialize state
    this.connectionMode = this.store.get('connectionMode', 'local');
    this.gatewayUrl = this.store.get('gatewayUrl', this.defaults.gatewayUrl);
    this.apiUrl = this.store.get('apiUrl', this.defaults.apiUrl);
    this.apiSecret = this.store.get('apiSecret', this.defaults.apiSecret);
    this.notifications = this.store.get('notifications', this.defaults.notifications);
    this.autoConnect = this.store.get('autoConnect', this.defaults.autoConnect);
    this.startMinimized = this.store.get('startMinimized', this.defaults.startMinimized);
    this.theme = this.store.get('theme', this.defaults.theme);
    this.onboardingSeen = this.store.get('onboardingSeen', false);
    
    // Runtime state
    this._isConnected = false;
    this._isConnecting = false;
    this._connectionError = null;
    this._statusCache = null;
    this._statusTimestamp = 0;
    this._sessionsCache = [];
    this._sessionsTimestamp = 0;
    this._messagesCache = [];
    this._messagesTimestamp = 0;
    this._startTime = Date.now();
    
    // Polling intervals
    this._statusInterval = null;
    this._sessionsInterval = null;
    this._messagesInterval = null;
  }
  
  // Getters
  get isConnected() {
    return this._isConnected;
  }
  
  get isConnecting() {
    return this._isConnecting;
  }
  
  get connectionError() {
    return this._connectionError;
  }
  
  get uptime() {
    return Math.floor((Date.now() - this._startTime) / 1000);
  }
  
  get memoryUsage() {
    const used = process.memoryUsage();
    return {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      rss: Math.round(used.rss / 1024 / 1024)
    };
  }
  
  get activeSessions() {
    return this._sessionsCache.length;
  }
  
  // State management
  setConnectionMode(mode) {
    this.connectionMode = mode;
    this.store.set('connectionMode', mode);
    this.emit('connectionStateChanged', this._getConnectionState());
    this.emit('configChanged');
  }
  
  setGatewayUrl(url) {
    this.gatewayUrl = url;
    this.store.set('gatewayUrl', url);
    
    // Update apiUrl based on gatewayUrl
    if (this.connectionMode === 'local') {
      this.apiUrl = `${url}/api`;
      this.store.set('apiUrl', this.apiUrl);
    }
    
    this.emit('configChanged');
  }
  
  setApiSecret(secret) {
    this.apiSecret = secret;
    this.store.set('apiSecret', secret);
    this.emit('configChanged');
  }
  
  // Connection state
  _getConnectionState() {
    if (this._isConnecting) return 'connecting';
    if (this._isConnected) return 'connected';
    if (this.connectionMode === 'unconfigured') return 'unconfigured';
    return 'disconnected';
  }
  
  async testConnection() {
    this._isConnecting = true;
    this._connectionError = null;
    this.emit('connectionStateChanged', 'connecting');
    
    try {
      const url = this.apiUrl || `${this.gatewayUrl}/api`;
      const response = await fetch(`${url}/status`, {
        method: 'GET',
        headers: this._getHeaders()
      });
      
      if (response.ok) {
        this._isConnected = true;
        this._isConnecting = false;
        this.emit('connectionStateChanged', 'connected');
        return { success: true, status: await response.json() };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      this._isConnected = false;
      this._isConnecting = false;
      this._connectionError = error.message;
      this.emit('connectionStateChanged', 'disconnected');
      return { success: false, error: error.message };
    }
  }
  
  // Status
  async getStatus() {
    try {
      const url = this.apiUrl || `${this.gatewayUrl}/api`;
      const response = await fetch(`${url}/status`, {
        method: 'GET',
        headers: this._getHeaders()
      });
      
      if (response.ok) {
        const status = await response.json();
        this._statusCache = status;
        this._statusTimestamp = Date.now();
        return status;
      }
      return this._statusCache || null;
    } catch (error) {
      console.error('Failed to get status:', error);
      return this._statusCache;
    }
  }
  
  // Sessions
  async getSessions() {
    try {
      const url = this.apiUrl || `${this.gatewayUrl}/api`;
      const response = await fetch(`${url}/sessions`, {
        method: 'GET',
        headers: this._getHeaders()
      });
      
      if (response.ok) {
        const sessions = await response.json();
        this._sessionsCache = sessions;
        this._sessionsTimestamp = Date.now();
        return sessions;
      }
      return this._sessionsCache;
    } catch (error) {
      console.error('Failed to get sessions:', error);
      return this._sessionsCache;
    }
  }
  
  // Messages
  async getMessages(limit = 50) {
    try {
      const url = this.apiUrl || `${this.gatewayUrl}/api`;
      const response = await fetch(`${url}/messages?limit=${limit}`, {
        method: 'GET',
        headers: this._getHeaders()
      });
      
      if (response.ok) {
        const messages = await response.json();
        this._messagesCache = messages;
        this._messagesTimestamp = Date.now();
        return messages;
      }
      return this._messagesCache;
    } catch (error) {
      console.error('Failed to get messages:', error);
      return this._messagesCache;
    }
  }
  
  // Send message
  async sendMessage(message, target = null) {
    try {
      const url = this.apiUrl || `${this.gatewayUrl}/api`;
      const body = target ? { message, target } : { message };
      
      const response = await fetch(`${url}/chat`, {
        method: 'POST',
        headers: {
          ...this._getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        return { success: true, result: await response.json() };
      } else {
        const error = await response.text();
        return { success: false, error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  // Helper methods
  _getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (this.apiSecret) {
      headers['X-API-Secret'] = this.apiSecret;
    }
    
    return headers;
  }
  
  saveConfig() {
    this.store.set('gatewayUrl', this.gatewayUrl);
    this.store.set('apiUrl', this.apiUrl);
    this.store.set('apiSecret', this.apiSecret);
    this.store.set('notifications', this.notifications);
    this.store.set('autoConnect', this.autoConnect);
    this.store.set('startMinimized', this.startMinimized);
    this.store.set('theme', this.theme);
  }
  
  markOnboardingSeen() {
    this.onboardingSeen = true;
    this.store.set('onboardingSeen', true);
  }
  
  resetConfig() {
    // Reset to defaults
    this.connectionMode = 'local';
    this.gatewayUrl = this.defaults.gatewayUrl;
    this.apiUrl = this.defaults.apiUrl;
    this.apiSecret = '';
    this.notifications = this.defaults.notifications;
    this.autoConnect = this.defaults.autoConnect;
    this.startMinimized = this.defaults.startMinimized;
    this.theme = this.defaults.theme;
    this.onboardingSeen = false;
    
    // Clear store
    this.store.clear();
    
    // Emit events
    this.emit('connectionStateChanged', 'unconfigured');
    this.emit('configChanged');
  }
  
  async restartGateway() {
    // This would require Gateway API access
    return { success: false, error: 'Restart not implemented yet' };
  }
  
  getSystemInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      uptime: this.uptime,
      memoryUsage: this.memoryUsage
    };
  }
  
  // Start/stop polling
  startPolling(interval = 5000) {
    this.stopPolling();
    
    this._statusInterval = setInterval(() => this.getStatus(), interval);
    this._sessionsInterval = setInterval(() => this.getSessions(), interval);
    this._messagesInterval = setInterval(() => this.getMessages(), interval);
  }
  
  stopPolling() {
    if (this._statusInterval) clearInterval(this._statusInterval);
    if (this._sessionsInterval) clearInterval(this._sessionsInterval);
    if (this._messagesInterval) clearInterval(this._messagesInterval);
    this._statusInterval = null;
    this._sessionsInterval = null;
    this._messagesInterval = null;
  }
}

// Export singleton instance
module.exports = new AppState();
