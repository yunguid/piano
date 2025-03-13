// Logger.ts - Enhanced logging utility for the piano application
import { loggerClient } from './LoggerClient';

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SUCCESS = 4
}

// Environment-based configuration
const LOG_LEVEL = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
const ENABLE_TIMESTAMPS = true;
const ENABLE_REMOTE_LOGGING = process.env.NODE_ENV !== 'test';
const DEBUG_CONSOLE_CONTAINER_ID = 'debug-console-container'; // ID of the container element

// Messages to filter out from the debug console
const FILTER_PATTERNS = [
  'Forcing debug console to be visible',
  'Removing keyboard event listeners',
  'Setting up keyboard event listeners',
  'Debug console container found',
  'Debug console initialized'
];

// Check if a message should be filtered
const shouldFilter = (message: string): boolean => {
  return FILTER_PATTERNS.some(pattern => message.includes(pattern));
};

// ANSI color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  // Foreground colors
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    crimson: '\x1b[38m'
  },
  // Background colors
  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m',
    crimson: '\x1b[48m'
  }
};

// Emoji indicators for different log types
const LOG_ICONS = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
  success: '✓',
  music: '🎵',
  piano: '🎹',
  api: '🌐',
  melody: '🎼',
  chord: '🎵',
  audio: '🔊',
  performance: '⚡',
};

class Logger {
  private context: string;
  private perfMarks: Record<string, number> = {};
  private static consoleInitialized = false;
  private logCount = 0;
  
  constructor(context: string = 'App') {
    this.context = context;
    
    // Initialize the debug console UI if not already done
    if (!Logger.consoleInitialized && typeof window !== 'undefined') {
      console.log(`Initializing Logger for context: ${context}`);
      
      // Wait for DOM to be fully loaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          console.log('DOM loaded, initializing debug console');
          this.initializeConsoleUI();
          Logger.consoleInitialized = true;
        });
      } else {
        console.log('DOM already loaded, initializing debug console immediately');
        this.initializeConsoleUI();
        Logger.consoleInitialized = true;
      }
    }
  }
  
  // Log detailed system information
  logSystemInfo(): void {
    this.info('System Information', {
      timestamp: new Date().toISOString(),
      browser: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      screen: {
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: window.devicePixelRatio,
        colorDepth: window.screen.colorDepth
      }
    });
    
    // Log audio capabilities
    this.info('Audio System Capabilities', {
      audioContext: typeof AudioContext !== 'undefined' ? 'supported' : 'not supported',
      webAudio: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
      sampleRate: typeof AudioContext !== 'undefined' ? new AudioContext().sampleRate : 'unknown',
      audioWorklet: typeof AudioContext !== 'undefined' && 'audioWorklet' in AudioContext.prototype ? 'supported' : 'not supported'
    });
    
    // Log MIDI capabilities
    this.info('MIDI System Capabilities', {
      midiAccess: typeof navigator.requestMIDIAccess !== 'undefined' ? 'supported' : 'not supported'
    });
    
    // Log performance metrics
    try {
      this.info('Performance Metrics', {
        memory: (performance as any).memory ? {
          jsHeapSizeLimit: Math.round((performance as any).memory.jsHeapSizeLimit / (1024 * 1024)) + ' MB',
          totalJSHeapSize: Math.round((performance as any).memory.totalJSHeapSize / (1024 * 1024)) + ' MB',
          usedJSHeapSize: Math.round((performance as any).memory.usedJSHeapSize / (1024 * 1024)) + ' MB'
        } : 'not available',
        navigation: performance.getEntriesByType('navigation').length > 0 ? 
          performance.getEntriesByType('navigation')[0] : 'not available'
      });
    } catch (e) {
      this.warn('Could not access performance metrics', e);
    }
    
    // Log different types of messages to test all log levels
    this.debug('Debug message test');
    this.info('Info message test');
    this.warn('Warning message test');
    this.error('Error message test');
    this.success('Success message test');
  }
  
  // Initialize the debug console UI
  private initializeConsoleUI(): void {
    if (typeof document === 'undefined') return;
    
    console.log('Starting debug console UI initialization');
    
    // Find the debug console container
    const container = document.getElementById(DEBUG_CONSOLE_CONTAINER_ID);
    if (!container) {
      console.error(`Debug console container with ID ${DEBUG_CONSOLE_CONTAINER_ID} not found!`);
      return;
    }
    
    console.log('Debug console container found, setting up UI');
    
    // Clear any existing content
    container.innerHTML = '';
    
    // Make sure the container is visible
    container.style.display = 'flex';
    container.style.opacity = '1';
    container.style.visibility = 'visible';
    container.style.zIndex = '99999';
    
    // Create the debug console elements
    const consoleHeader = document.createElement('div');
    consoleHeader.className = 'debug-console-header';
    
    // Create header with title and controls
    const titleSpan = document.createElement('span');
    titleSpan.textContent = 'Debug Console';
    
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'debug-console-controls';
    
    // Add minimize and close buttons
    const minimizeBtn = document.createElement('button');
    minimizeBtn.innerHTML = '&#9776;'; // Hamburger icon
    minimizeBtn.className = 'debug-console-btn';
    minimizeBtn.title = 'Toggle console';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;'; // X icon
    closeBtn.className = 'debug-console-btn';
    closeBtn.title = 'Close console';
    
    controlsDiv.appendChild(minimizeBtn);
    controlsDiv.appendChild(closeBtn);
    
    consoleHeader.appendChild(titleSpan);
    consoleHeader.appendChild(controlsDiv);
    
    // Create status indicators section
    const statusSection = document.createElement('div');
    statusSection.className = 'debug-console-status';
    
    // Add status indicators
    const createStatusIndicator = (label: string, value: string, color: string) => {
      const indicator = document.createElement('div');
      indicator.className = 'status-indicator';
      
      const labelSpan = document.createElement('span');
      labelSpan.className = 'status-label';
      labelSpan.textContent = label + ':';
      
      const valueSpan = document.createElement('span');
      valueSpan.className = 'status-value';
      valueSpan.textContent = value;
      valueSpan.style.color = color;
      
      indicator.appendChild(labelSpan);
      indicator.appendChild(valueSpan);
      
      return indicator;
    };
    
    statusSection.appendChild(createStatusIndicator('PLAYING', 'NO', '#ff3333'));
    statusSection.appendChild(createStatusIndicator('NOTE INDEX', '0', '#00ff00'));
    statusSection.appendChild(createStatusIndicator('AUDIO CTX', 'running', '#00ff00'));
    statusSection.appendChild(createStatusIndicator('ACTIVE NOTES', '0', '#ff9900'));
    statusSection.appendChild(createStatusIndicator('SOUND', 'default', '#ff66ff'));
    
    // Create log content area
    const consoleContent = document.createElement('div');
    consoleContent.className = 'debug-console-content';
    consoleContent.id = 'debug-console-content';
    
    // Create event log section with header
    const eventLogHeader = document.createElement('div');
    eventLogHeader.className = 'event-log-header';
    
    const eventLogLabel = document.createElement('span');
    eventLogLabel.textContent = 'EVENT LOG';
    eventLogLabel.className = 'event-log-label';
    
    const entriesCount = document.createElement('span');
    entriesCount.textContent = '0 entries';
    entriesCount.className = 'entries-count';
    entriesCount.id = 'log-entries-count';
    
    eventLogHeader.appendChild(eventLogLabel);
    eventLogHeader.appendChild(entriesCount);
    
    // Create log entries container
    const logEntries = document.createElement('div');
    logEntries.className = 'log-entries';
    logEntries.id = 'log-entries';
    
    // Add initial message
    const initialEntry = document.createElement('div');
    initialEntry.className = 'debug-log-entry info';
    initialEntry.textContent = `[${new Date().toLocaleTimeString()}] [System] Debug console initialized`;
    logEntries.appendChild(initialEntry);
    
    // Add clear button
    const clearBtn = document.createElement('button');
    clearBtn.className = 'clear-log-btn';
    clearBtn.textContent = 'Clear Log';
    clearBtn.onclick = () => {
      logEntries.innerHTML = '';
      this.logCount = 0;
      this.updateEntriesCount();
    };
    
    // Assemble the console
    container.appendChild(consoleHeader);
    container.appendChild(statusSection);
    container.appendChild(eventLogHeader);
    container.appendChild(logEntries);
    container.appendChild(clearBtn);
    
    // Add event listeners for controls
    minimizeBtn.addEventListener('click', () => {
      if (logEntries.style.display === 'none') {
        logEntries.style.display = 'block';
        statusSection.style.display = 'grid';
        eventLogHeader.style.display = 'flex';
        clearBtn.style.display = 'block';
        container.style.height = '100%';
      } else {
        logEntries.style.display = 'none';
        statusSection.style.display = 'none';
        eventLogHeader.style.display = 'none';
        clearBtn.style.display = 'none';
        container.style.height = 'auto';
      }
    });
    
    closeBtn.addEventListener('click', () => {
      container.style.display = 'none';
    });
    
    console.log('Debug console UI initialized successfully');
  }
  
  // Update the entries count in the UI
  private updateEntriesCount(): void {
    const entriesCountElement = document.getElementById('log-entries-count');
    if (entriesCountElement) {
      entriesCountElement.textContent = `${this.logCount} entries`;
    }
  }
  
  // Add a log entry to the debug console
  private addLogToConsole(level: string, message: string, data?: any): void {
    if (typeof document === 'undefined') return;
    
    // Filter out repetitive messages
    if (shouldFilter(message)) return;
    
    const logEntries = document.getElementById('log-entries');
    if (!logEntries) return;
    
    // Create log entry element
    const entry = document.createElement('div');
    entry.className = `debug-log-entry ${level}`;
    
    // Format timestamp
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    // Format log message
    let icon = LOG_ICONS[level as keyof typeof LOG_ICONS] || '';
    let logMessage = `[${timestamp}] ${icon ? icon + ' ' : ''}${level.toUpperCase()} [${this.context}] ${message}`;
    
    // Add data if provided
    if (data !== undefined) {
      try {
        if (typeof data === 'object') {
          const dataStr = JSON.stringify(data, null, 2);
          logMessage += `\n${dataStr}`;
        } else {
          logMessage += ` ${data}`;
        }
      } catch (e) {
        logMessage += ' [Non-serializable data]';
      }
    }
    
    entry.textContent = logMessage;
    
    // Add to console
    logEntries.appendChild(entry);
    
    // Increment log count
    this.logCount++;
    this.updateEntriesCount();
    
    // Scroll to bottom
    logEntries.scrollTop = logEntries.scrollHeight;
    
    // Force the debug console to be visible
    const container = document.getElementById(DEBUG_CONSOLE_CONTAINER_ID);
    if (container) {
      container.style.display = 'flex';
      container.style.opacity = '1';
      container.style.visibility = 'visible';
      container.style.zIndex = '99999';
    }
  }
  
  // Debug level log
  debug(message: string, data?: any): void {
    if (LOG_LEVEL > LogLevel.DEBUG) return;
    
    // Filter out repetitive messages
    if (shouldFilter(message)) {
      // Still log to console but don't add to UI
      const icon = LOG_ICONS.debug;
      const formattedMessage = `${icon} DEBUG [${this.context}] ${message}`;
      console.debug(formattedMessage, data !== undefined ? data : '');
      
      if (ENABLE_REMOTE_LOGGING) {
        loggerClient.log('debug', this.context, message, data);
      }
      
      return;
    }
    
    const icon = LOG_ICONS.debug;
    const formattedMessage = `${icon} DEBUG [${this.context}] ${message}`;
    
    console.debug(formattedMessage, data !== undefined ? data : '');
    
    if (ENABLE_REMOTE_LOGGING) {
      loggerClient.log('debug', this.context, message, data);
    }
    
    this.addLogToConsole('debug', message, data);
  }
  
  // Info level log
  info(message: string, data?: any): void {
    if (LOG_LEVEL > LogLevel.INFO) return;
    
    // Filter out repetitive messages
    if (shouldFilter(message)) {
      // Still log to console but don't add to UI
      const icon = LOG_ICONS.info;
      const formattedMessage = `${icon} INFO [${this.context}] ${message}`;
      console.info(formattedMessage, data !== undefined ? data : '');
      
      if (ENABLE_REMOTE_LOGGING) {
        loggerClient.log('info', this.context, message, data);
      }
      
      return;
    }
    
    const icon = LOG_ICONS.info;
    const formattedMessage = `${icon} INFO [${this.context}] ${message}`;
    
    console.info(formattedMessage, data !== undefined ? data : '');
    
    if (ENABLE_REMOTE_LOGGING) {
      loggerClient.log('info', this.context, message, data);
    }
    
    this.addLogToConsole('info', message, data);
  }
  
  // Warning level log
  warn(message: string, data?: any): void {
    if (LOG_LEVEL > LogLevel.WARN) return;
    
    const icon = LOG_ICONS.warn;
    const formattedMessage = `${icon} WARN [${this.context}] ${message}`;
    
    console.warn(formattedMessage, data !== undefined ? data : '');
    
    if (ENABLE_REMOTE_LOGGING) {
      loggerClient.log('warn', this.context, message, data);
    }
    
    this.addLogToConsole('warn', message, data);
  }
  
  // Error level log
  error(message: string, data?: any): void {
    if (LOG_LEVEL > LogLevel.ERROR) return;
    
    const icon = LOG_ICONS.error;
    const formattedMessage = `${icon} ERROR [${this.context}] ${message}`;
    
    console.error(formattedMessage, data !== undefined ? data : '');
    
    if (ENABLE_REMOTE_LOGGING) {
      loggerClient.log('error', this.context, message, data);
    }
    
    this.addLogToConsole('error', message, data);
  }
  
  // Success level log
  success(message: string, data?: any): void {
    if (LOG_LEVEL > LogLevel.SUCCESS) return;
    
    const icon = LOG_ICONS.success;
    const formattedMessage = `${icon} SUCCESS [${this.context}] ${message}`;
    
    console.log(formattedMessage, data !== undefined ? data : '');
    
    if (ENABLE_REMOTE_LOGGING) {
      loggerClient.log('success', this.context, message, data);
    }
    
    this.addLogToConsole('success', message, data);
  }
  
  // Piano-specific log
  piano(message: string, data?: any): void {
    const icon = LOG_ICONS.piano;
    const formattedMessage = `${icon} PIANO [${this.context}] ${message}`;
    
    console.log(formattedMessage, data !== undefined ? data : '');
    
    if (ENABLE_REMOTE_LOGGING) {
      loggerClient.log('piano', this.context, message, data);
    }
    
    this.addLogToConsole('piano', message, data);
  }
  
  // Music-specific log
  music(message: string, data?: any): void {
    const icon = LOG_ICONS.music;
    const formattedMessage = `${icon} MUSIC [${this.context}] ${message}`;
    
    console.log(formattedMessage, data !== undefined ? data : '');
    
    if (ENABLE_REMOTE_LOGGING) {
      loggerClient.log('music', this.context, message, data);
    }
    
    this.addLogToConsole('music', message, data);
  }
  
  // Performance measurement start
  startPerf(label: string): void {
    this.perfMarks[label] = performance.now();
  }
  
  // Performance measurement end
  endPerf(label: string, logLevel: 'debug' | 'info' | 'log' = 'log'): void {
    if (!this.perfMarks[label]) {
      this.warn(`No performance mark found for: ${label}`);
      return;
    }
    
    const duration = (performance.now() - this.perfMarks[label]).toFixed(2);
    const perfData = { duration, unit: 'ms' };
    
    switch (logLevel) {
      case 'debug':
        this.debug(`Completed ${label}`, perfData);
        break;
      case 'info':
        this.info(`Completed ${label}`, perfData);
        break;
      default:
        console.log(`${LOG_ICONS.performance} [${this.context}] Completed ${label}`, perfData);
        this.addLogToConsole('performance', `Completed ${label}`, perfData);
    }
    
    // Clean up the mark
    delete this.perfMarks[label];
  }
}

// Export a singleton instance as default
export default Logger; 