/**
 * GatewayConfig.js - Gateway configuration and detection utilities
 * Shared between Mac and Linux companions
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

class GatewayConfig {
  constructor() {
    this.defaultGatewayPort = 3000;
    this.defaultApiPort = 4000;
  }
  
  /**
   * Detect if Clawdbot Gateway is running
   */
  static async detectGateway() {
    const port = process.env.CLAWDBOT_PORT || 3000;
    
    try {
      const response = await fetch(`http://localhost:${port}/status`, {
        method: 'GET',
        timeout: 2000
      });
      
      if (response.ok) {
        const status = await response.json();
        return {
          running: true,
          port,
          version: status.version,
          uptime: status.uptime
        };
      }
    } catch (error) {
      // Gateway not running
    }
    
    return { running: false, port };
  }
  
  /**
   * Get default gateway URL
   */
  static getDefaultGatewayUrl() {
    const port = process.env.CLAWDBOT_PORT || 3000;
    return `http://localhost:${port}`;
  }
  
  /**
   * Get default API URL
   */
  static getDefaultApiUrl() {
    const apiPort = process.env.CLAWDBOT_API_PORT || 4000;
    return `http://localhost:${apiPort}/api`;
  }
  
  /**
   * Check if this is first run
   */
  static isFirstRun() {
    const configDir = path.join(os.homedir(), '.clawdbot');
    const configFile = path.join(configDir, 'clawdbot-companion.json');
    return !fs.existsSync(configFile);
  }
  
  /**
   * Get platform-specific default settings
   */
  static getPlatformDefaults() {
    const platform = process.platform;
    
    const defaults = {
      darwin: { // macOS
        autoStart: true,
        notifications: true,
        menuBar: true
      },
      linux: { // Linux
        autoStart: false,
        notifications: true,
        tray: true
      },
      win32: { // Windows
        autoStart: true,
        notifications: true,
        tray: true
      }
    };
    
    return defaults[platform] || defaults.linux;
  }
  
  /**
   * Validate gateway URL format
   */
  static validateGatewayUrl(url) {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { valid: false, error: 'URL must use http or https protocol' };
      }
      if (!parsed.hostname) {
        return { valid: false, error: 'Invalid hostname' };
      }
      return { valid: true, parsed };
    } catch (error) {
      return { valid: false, error: 'Invalid URL format' };
    }
  }
  
  /**
   * Get connection status based on config
   */
  static getConnectionStatus(config) {
    if (!config.gatewayUrl) {
      return { status: 'unconfigured', message: 'Gateway URL not set' };
    }
    
    if (!config.apiSecret) {
      return { status: 'incomplete', message: 'API secret not configured' };
    }
    
    return { status: 'ready', message: 'Ready to connect' };
  }
  
  /**
   * Test connection to gateway
   */
  static async testConnection(gatewayUrl, apiSecret = '') {
    try {
      const statusUrl = `${gatewayUrl}/status`;
      const response = await fetch(statusUrl, {
        method: 'GET',
        timeout: 5000,
        headers: apiSecret ? { 'X-API-Secret': apiSecret } : {}
      });
      
      if (response.ok) {
        const status = await response.json();
        return { success: true, status };
      } else if (response.status === 401) {
        return { success: false, error: 'Invalid API secret' };
      } else {
        return { success: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get available ports for Clawdbot
   */
  static getAvailablePorts() {
    return {
      gateway: process.env.CLAWDBOT_PORT || 3000,
      api: process.env.CLAWDBOT_API_PORT || 4000,
      dashboard: process.env.CLAWDBOT_DASHBOARD_PORT || 18789
    };
  }
  
  /**
   * Check if port is in use
   */
  static async isPortInUse(port) {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      
      socket.setTimeout(2000);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.on('error', (err) => {
        if (err.code === 'ECONNREFUSED') {
          resolve(false);
        } else {
          resolve(true);
        }
      });
      
      socket.connect(port, 'localhost');
    });
  }
  
  /**
   * Generate API secret if not exists
   */
  static generateApiSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let secret = 'clawdbot-';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }
}

module.exports = GatewayConfig;
