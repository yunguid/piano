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
  success: '✅',
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
  
  constructor(context: string = 'App') {
    this.context = context;
  }
  
  private getTimestamp(): string {
    if (!ENABLE_TIMESTAMPS) return '';
    
    const now = new Date();
    return `${COLORS.dim}[${now.toLocaleTimeString('en-US', { hour12: false })}.${now.getMilliseconds().toString().padStart(3, '0')}]${COLORS.reset} `;
  }
  
  private formatMessage(level: string, icon: string, message: string, data?: any): string {
    const timestamp = this.getTimestamp();
    const contextStr = `${COLORS.fg.cyan}[${this.context}]${COLORS.reset}`;
    
    let formattedMsg = `${timestamp}${contextStr} ${icon} ${message}`;
    
    if (data) {
      if (typeof data === 'object') {
        try {
          // Try to format the object with indentation for readability
          const jsonStr = JSON.stringify(data, null, 2);
          // Only show an excerpt if it's very large
          const excerpt = jsonStr.length > 500 ? jsonStr.substring(0, 500) + '...' : jsonStr;
          formattedMsg += `\n${COLORS.dim}${excerpt}${COLORS.reset}`;
        } catch (e) {
          formattedMsg += `\n${COLORS.dim}[Non-serializable data]${COLORS.reset}`;
        }
      } else {
        formattedMsg += ` ${COLORS.dim}${data}${COLORS.reset}`;
      }
    }
    
    return formattedMsg;
  }
  
  debug(message: string, data?: any): void {
    if (LOG_LEVEL <= LogLevel.DEBUG) {
      const formattedMessage = this.formatMessage(
        'DEBUG', 
        LOG_ICONS.debug, 
        `${COLORS.dim}${message}${COLORS.reset}`, 
        data
      );
      console.debug(formattedMessage);
      
      // Send to remote logger
      if (ENABLE_REMOTE_LOGGING) {
        loggerClient.log('debug', this.context, message, data);
      }
    }
  }
  
  info(message: string, data?: any): void {
    if (LOG_LEVEL <= LogLevel.INFO) {
      const formattedMessage = this.formatMessage(
        'INFO', 
        LOG_ICONS.info, 
        `${COLORS.fg.blue}${message}${COLORS.reset}`, 
        data
      );
      console.info(formattedMessage);
      
      // Send to remote logger
      if (ENABLE_REMOTE_LOGGING) {
        loggerClient.log('info', this.context, message, data);
      }
    }
  }
  
  warn(message: string, data?: any): void {
    if (LOG_LEVEL <= LogLevel.WARN) {
      const formattedMessage = this.formatMessage(
        'WARN', 
        LOG_ICONS.warn, 
        `${COLORS.fg.yellow}${message}${COLORS.reset}`, 
        data
      );
      console.warn(formattedMessage);
      
      // Send to remote logger
      if (ENABLE_REMOTE_LOGGING) {
        loggerClient.log('warn', this.context, message, data);
      }
    }
  }
  
  error(message: string, error?: any): void {
    if (LOG_LEVEL <= LogLevel.ERROR) {
      const formattedMessage = this.formatMessage(
        'ERROR', 
        LOG_ICONS.error, 
        `${COLORS.fg.red}${message}${COLORS.reset}`, 
        error
      );
      console.error(formattedMessage);
      
      // Send to remote logger
      if (ENABLE_REMOTE_LOGGING) {
        loggerClient.log('error', this.context, message, error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error);
      }
      
      // If it's an Error object, log the stack trace
      if (error instanceof Error) {
        console.error(`${COLORS.fg.red}${error.stack}${COLORS.reset}`);
      }
    }
  }
  
  success(message: string, data?: any): void {
    if (LOG_LEVEL <= LogLevel.SUCCESS) {
      const formattedMessage = this.formatMessage(
        'SUCCESS', 
        LOG_ICONS.success, 
        `${COLORS.fg.green}${message}${COLORS.reset}`, 
        data
      );
      console.log(formattedMessage);
      
      // Send to remote logger
      if (ENABLE_REMOTE_LOGGING) {
        loggerClient.log('success', this.context, message, data);
      }
    }
  }
  
  // Music specific logging
  music(message: string, data?: any): void {
    if (LOG_LEVEL <= LogLevel.INFO) {
      const formattedMessage = this.formatMessage(
        'MUSIC', 
        LOG_ICONS.music, 
        `${COLORS.fg.magenta}${message}${COLORS.reset}`, 
        data
      );
      console.info(formattedMessage);
      
      // Send to remote logger
      if (ENABLE_REMOTE_LOGGING) {
        loggerClient.log('music', this.context, message, data);
      }
    }
  }
  
  // Piano specific logging
  piano(message: string, data?: any): void {
    if (LOG_LEVEL <= LogLevel.INFO) {
      const formattedMessage = this.formatMessage(
        'PIANO', 
        LOG_ICONS.piano, 
        `${COLORS.fg.cyan}${message}${COLORS.reset}`, 
        data
      );
      console.info(formattedMessage);
      
      // Send to remote logger
      if (ENABLE_REMOTE_LOGGING) {
        loggerClient.log('piano', this.context, message, data);
      }
    }
  }
  
  // API specific logging
  api(message: string, data?: any): void {
    if (LOG_LEVEL <= LogLevel.INFO) {
      const formattedMessage = this.formatMessage(
        'API', 
        LOG_ICONS.api, 
        `${COLORS.fg.yellow}${message}${COLORS.reset}`, 
        data
      );
      console.info(formattedMessage);
      
      // Send to remote logger
      if (ENABLE_REMOTE_LOGGING) {
        loggerClient.log('api', this.context, message, data);
      }
    }
  }
  
  // Performance measurement utilities
  perfStart(label: string): void {
    this.perfMarks[label] = performance.now();
    if (LOG_LEVEL <= LogLevel.DEBUG) {
      const formattedMessage = this.formatMessage(
        'PERF', 
        LOG_ICONS.performance, 
        `${COLORS.fg.blue}⏱️ Started [${label}]${COLORS.reset}`
      );
      console.debug(formattedMessage);
    }
  }
  
  perfEnd(label: string): void {
    if (this.perfMarks[label]) {
      const duration = performance.now() - this.perfMarks[label];
      const formattedMessage = this.formatMessage(
        'PERF', 
        LOG_ICONS.performance, 
        `${COLORS.fg.blue}⏱️ Completed [${label}] in ${duration.toFixed(2)}ms${COLORS.reset}`
      );
      console.debug(formattedMessage);
      
      // Send to remote logger
      if (ENABLE_REMOTE_LOGGING) {
        loggerClient.log('performance', this.context, `Completed ${label}`, { 
          duration: duration.toFixed(2), 
          unit: 'ms' 
        });
      }
      
      // Clean up performance mark
      delete this.perfMarks[label];
    } else {
      this.warn(`Attempted to end performance measurement [${label}] without starting it first`);
    }
  }
  
  // Factory method to create a new logger with a different context
  createLogger(context: string): Logger {
    return new Logger(context);
  }
}

// Export a singleton instance as default
export default Logger; 