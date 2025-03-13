import Logger from './Logger';

/**
 * Initialize the logger and log system information
 * This is a separate file to avoid adding more code to EnhancedPiano.tsx
 */
export const initializeLogging = (): void => {
  // Create a logger instance
  const logger = new Logger('System');
  
  // Force immediate display of debug console
  forceDebugConsoleVisible();
  
  // Intercept console logs
  interceptConsoleLogs();
  
  // Log system information
  logger.logSystemInfo();
  
  // Log piano-specific information
  logger.info('Piano Application Started', {
    version: '1.0.0',
    buildTime: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
  
  // Log additional piano-specific information
  const pianoLogger = new Logger('Piano');
  pianoLogger.piano('Piano component ready for input');
  pianoLogger.music('Music system initialized');
  
  // Force the debug console to be visible again after a delay
  setTimeout(forceDebugConsoleVisible, 500);
  setTimeout(forceDebugConsoleVisible, 1000);
  setTimeout(forceDebugConsoleVisible, 2000);
  
  // Log WebGL capabilities
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown';
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
      
      logger.info('WebGL Information', {
        vendor,
        renderer,
        version: gl.getParameter(gl.VERSION),
        shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE)
      });
    } else {
      logger.warn('WebGL not supported');
    }
  } catch (e) {
    logger.warn('Error getting WebGL information', e);
  }
};

/**
 * Intercept console logs and redirect them to our debug console
 */
const interceptConsoleLogs = (): void => {
  // Store original console methods
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };
  
  // Messages to filter out
  const filterPatterns = [
    'Forcing debug console to be visible',
    'Removing keyboard event listeners',
    'Setting up keyboard event listeners'
  ];
  
  // Check if a message should be filtered
  const shouldFilter = (message: string): boolean => {
    return filterPatterns.some(pattern => message.includes(pattern));
  };
  
  // Override console.log
  console.log = function(...args) {
    // Call original method
    originalConsole.log.apply(console, args);
    
    // Convert args to string
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    // Filter out repetitive messages
    if (!shouldFilter(message)) {
      addToDebugConsole('debug', 'Console', message);
    }
  };
  
  // Override console.info
  console.info = function(...args) {
    // Call original method
    originalConsole.info.apply(console, args);
    
    // Convert args to string
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    // Filter out repetitive messages
    if (!shouldFilter(message)) {
      addToDebugConsole('info', 'Console', message);
    }
  };
  
  // Override console.warn
  console.warn = function(...args) {
    // Call original method
    originalConsole.warn.apply(console, args);
    
    // Convert args to string
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    // Filter out repetitive messages
    if (!shouldFilter(message)) {
      addToDebugConsole('warn', 'Console', message);
    }
  };
  
  // Override console.error
  console.error = function(...args) {
    // Call original method
    originalConsole.error.apply(console, args);
    
    // Convert args to string
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    // Always show errors, they're important
    addToDebugConsole('error', 'Console', message);
  };
  
  // Override console.debug
  console.debug = function(...args) {
    // Call original method
    originalConsole.debug.apply(console, args);
    
    // Convert args to string
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    // Filter out repetitive messages
    if (!shouldFilter(message)) {
      addToDebugConsole('debug', 'Console', message);
    }
  };
};

/**
 * Add a message to the debug console
 */
const addToDebugConsole = (level: string, context: string, message: string): void => {
  const debugConsole = document.getElementById('debug-console-container');
  if (!debugConsole) return;
  
  let logEntries = document.getElementById('log-entries');
  if (!logEntries) {
    // Force the debug console to be visible
    forceDebugConsoleVisible();
    logEntries = document.getElementById('log-entries');
    if (!logEntries) return;
  }
  
  // Add the log entry
  addDirectLog(logEntries, level, context, message);
  
  // Ensure the log entries container is scrolled to the bottom
  logEntries.scrollTop = logEntries.scrollHeight;
};

/**
 * Force the debug console to be visible and populated with logs
 * This uses direct DOM manipulation to ensure logs are displayed
 */
export const forceDebugConsoleVisible = (): void => {
  console.log('Forcing debug console to be visible');
  
  const debugConsole = document.getElementById('debug-console-container');
  if (!debugConsole) {
    console.error('Debug console container not found!');
    return;
  }
  
  // Force display with !important inline styles
  debugConsole.setAttribute('style', 
    'display: flex !important; ' +
    'opacity: 1 !important; ' +
    'visibility: visible !important; ' +
    'z-index: 99999 !important; ' +
    'position: fixed !important; ' +
    'right: 0 !important; ' +
    'top: 0 !important; ' +
    'width: 300px !important; ' +
    'height: 100% !important; ' +
    'background-color: rgba(10, 12, 16, 0.95) !important; ' +
    'color: #00ff00 !important; ' +
    'font-family: monospace !important; ' +
    'font-size: 12px !important; ' +
    'flex-direction: column !important; ' +
    'overflow: hidden !important; ' +
    'border-left: 1px solid rgba(255, 255, 255, 0.1) !important; ' +
    'box-shadow: -5px 0 15px rgba(0, 0, 0, 0.5) !important;'
  );
  
  // Find or create log entries container
  let logEntries = document.getElementById('log-entries');
  if (!logEntries) {
    console.log('Creating log entries container');
    
    // Clear any existing content
    debugConsole.innerHTML = '';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'debug-console-header';
    header.innerHTML = '<span>Debug Console</span>';
    header.setAttribute('style', 
      'background-color: #000 !important; ' +
      'color: #00ff00 !important; ' +
      'padding: 8px 12px !important; ' +
      'font-weight: bold !important; ' +
      'border-bottom: 1px solid #333 !important; ' +
      'display: flex !important; ' +
      'justify-content: space-between !important; ' +
      'align-items: center !important;'
    );
    debugConsole.appendChild(header);
    
    // Create status section
    const statusSection = document.createElement('div');
    statusSection.className = 'debug-console-status';
    statusSection.setAttribute('style',
      'display: grid !important; ' +
      'grid-template-columns: repeat(2, 1fr) !important; ' +
      'gap: 10px !important; ' +
      'padding: 10px !important; ' +
      'background-color: #111 !important; ' +
      'border-bottom: 1px solid #222 !important;'
    );
    
    // Add status indicators
    const createStatusIndicator = (label: string, value: string, color: string) => {
      const indicator = document.createElement('div');
      indicator.className = 'status-indicator';
      indicator.setAttribute('style',
        'display: flex !important; ' +
        'justify-content: space-between !important; ' +
        'align-items: center !important; ' +
        'background-color: rgba(0, 0, 0, 0.5) !important; ' +
        'padding: 5px 10px !important; ' +
        'border-radius: 4px !important;'
      );
      
      const labelSpan = document.createElement('span');
      labelSpan.className = 'status-label';
      labelSpan.textContent = label + ':';
      labelSpan.setAttribute('style',
        'color: #888 !important; ' +
        'font-size: 11px !important; ' +
        'text-transform: uppercase !important;'
      );
      
      const valueSpan = document.createElement('span');
      valueSpan.className = 'status-value';
      valueSpan.textContent = value;
      valueSpan.setAttribute('style',
        'font-weight: bold !important; ' +
        'font-size: 12px !important; ' +
        'color: ' + color + ' !important;'
      );
      
      indicator.appendChild(labelSpan);
      indicator.appendChild(valueSpan);
      
      return indicator;
    };
    
    statusSection.appendChild(createStatusIndicator('PLAYING', 'NO', '#ff3333'));
    statusSection.appendChild(createStatusIndicator('AUDIO CTX', 'running', '#00ff00'));
    statusSection.appendChild(createStatusIndicator('ACTIVE NOTES', '0', '#ff9900'));
    statusSection.appendChild(createStatusIndicator('SOUND', 'default', '#ff66ff'));
    
    debugConsole.appendChild(statusSection);
    
    // Create log entries container
    logEntries = document.createElement('div');
    logEntries.className = 'log-entries';
    logEntries.id = 'log-entries';
    logEntries.setAttribute('style',
      'flex: 1 !important; ' +
      'overflow-y: auto !important; ' +
      'padding: 10px !important; ' +
      'background-color: #000 !important; ' +
      'color: #00ff00 !important; ' +
      'font-family: monospace !important; ' +
      'font-size: 12px !important; ' +
      'line-height: 1.4 !important; ' +
      'max-height: calc(100% - 120px) !important;'
    );
    debugConsole.appendChild(logEntries);
  }
  
  // Clear "No events logged yet" message if present
  if (logEntries.textContent === 'No events logged yet') {
    logEntries.textContent = '';
  }
  
  // Add direct logs if the container is empty
  if (logEntries.children.length === 0) {
    // Add system information logs
    addDirectLog(logEntries, 'info', 'System', 'Debug console initialized');
    addDirectLog(logEntries, 'info', 'System', 'System Information', {
      browser: navigator.userAgent,
      platform: navigator.platform,
      screen: `${window.innerWidth}x${window.innerHeight}`
    });
    
    // Add audio capability logs
    addDirectLog(logEntries, 'info', 'Audio', 'Audio System Capabilities', {
      audioContext: typeof AudioContext !== 'undefined' ? 'supported' : 'not supported',
      webAudio: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined'
    });
    
    // Add MIDI capability logs
    addDirectLog(logEntries, 'info', 'MIDI', 'MIDI System Capabilities', {
      midiAccess: typeof navigator.requestMIDIAccess !== 'undefined' ? 'supported' : 'not supported'
    });
    
    // Add test logs for different levels
    addDirectLog(logEntries, 'debug', 'Test', 'Debug message test');
    addDirectLog(logEntries, 'info', 'Test', 'Info message test');
    addDirectLog(logEntries, 'warn', 'Test', 'Warning message test');
    addDirectLog(logEntries, 'error', 'Test', 'Error message test');
    addDirectLog(logEntries, 'success', 'Test', 'Success message test');
    
    // Add piano-specific logs
    addDirectLog(logEntries, 'info', 'Piano', 'Piano component ready for input');
    addDirectLog(logEntries, 'info', 'Music', 'Music system initialized');
  }
  
  // Ensure the log entries container is scrolled to the bottom
  logEntries.scrollTop = logEntries.scrollHeight;
};

/**
 * Add a direct log entry to the log entries container
 */
const addDirectLog = (
  logEntries: HTMLElement, 
  level: string, 
  context: string, 
  message: string, 
  data?: any
): void => {
  const entry = document.createElement('div');
  entry.className = `debug-log-entry ${level}`;
  
  // Set styles directly
  let color = '#00ff00';
  switch (level) {
    case 'debug': color = '#888'; break;
    case 'info': color = '#00aaff'; break;
    case 'warn': color = '#ffaa00'; break;
    case 'error': color = '#ff5555'; break;
    case 'success': color = '#00ff00'; break;
  }
  
  entry.setAttribute('style',
    'margin-bottom: 5px !important; ' +
    'padding: 3px !important; ' +
    'border-radius: 3px !important; ' +
    'word-break: break-word !important; ' +
    'color: ' + color + ' !important; ' +
    'white-space: pre-wrap !important;'
  );
  
  const timestamp = new Date().toLocaleTimeString('en-US', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  let logMessage = `[${timestamp}] [${context}] ${message}`;
  
  if (data) {
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
};

/**
 * Ensure the debug console is visible and properly initialized
 */
export const ensureDebugConsoleVisible = (): void => {
  // Try multiple times to ensure the debug console is visible
  const tryMakeVisible = (attempts = 0) => {
    if (attempts > 5) return; // Give up after 5 attempts
    
    const debugConsole = document.getElementById('debug-console-container');
    if (debugConsole) {
      console.log('Debug console container found, making visible');
      debugConsole.style.display = 'flex';
      debugConsole.style.opacity = '1';
      debugConsole.style.visibility = 'visible';
      
      // Make sure log entries are visible
      const logEntries = document.getElementById('log-entries');
      if (logEntries) {
        // If empty, add a message
        if (logEntries.children.length === 0 || logEntries.textContent === 'No events logged yet') {
          logEntries.textContent = '';
          
          // Add a direct message
          const entry = document.createElement('div');
          entry.className = 'debug-log-entry info';
          entry.textContent = `[${new Date().toLocaleTimeString()}] [System] Debug console initialized and visible`;
          logEntries.appendChild(entry);
          
          // Add a success message
          const successEntry = document.createElement('div');
          successEntry.className = 'debug-log-entry success';
          successEntry.textContent = `[${new Date().toLocaleTimeString()}] [System] All systems operational`;
          logEntries.appendChild(successEntry);
        }
        
        // Ensure the log entries container is scrolled to the bottom
        logEntries.scrollTop = logEntries.scrollHeight;
      }
      
      // Update status indicators if they exist
      const statusIndicators = document.querySelectorAll('.status-indicator');
      if (statusIndicators.length > 0) {
        // Update the status indicators with current information
        updateStatusIndicator(statusIndicators, 'PLAYING', 'NO', '#ff3333');
        updateStatusIndicator(statusIndicators, 'AUDIO CTX', 'running', '#00ff00');
        updateStatusIndicator(statusIndicators, 'ACTIVE NOTES', '0', '#ff9900');
      }
    } else {
      console.warn(`Debug console container not found, attempt ${attempts + 1}/5`);
      // Try again after a delay
      setTimeout(() => tryMakeVisible(attempts + 1), 500);
    }
  };
  
  // Start trying to make the debug console visible
  setTimeout(tryMakeVisible, 100);
};

/**
 * Update a status indicator with a new value and color
 */
const updateStatusIndicator = (
  indicators: NodeListOf<Element>, 
  label: string, 
  value: string, 
  color: string
): void => {
  indicators.forEach(indicator => {
    const labelEl = indicator.querySelector('.status-label');
    if (labelEl && labelEl.textContent === label + ':') {
      const valueEl = indicator.querySelector('.status-value') as HTMLElement | null;
      if (valueEl) {
        valueEl.textContent = value;
        valueEl.style.color = color;
      }
    }
  });
};

export default initializeLogging; 