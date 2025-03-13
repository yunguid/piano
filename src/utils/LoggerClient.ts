// LoggerClient.ts - Client for sending logs to a remote logging service

// Types of log messages
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success' | 'music' | 'piano' | 'api' | 'performance';

// Interface for a log entry
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: any;
}

// Configuration
const REMOTE_LOGGING_ENABLED = true; // Always enable for development
const WEBSOCKET_ENDPOINT = 'ws://localhost:8766';
const BATCH_SIZE = 5;
const FLUSH_INTERVAL_MS = 2000; // 2 seconds
const RECONNECT_INTERVAL_MS = 5000; // 5 seconds

class LoggerClient {
  private logQueue: LogEntry[] = [];
  private flushIntervalId: number | null = null;
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectTimeoutId: number | null = null;
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.connect();
      
      // Set up periodic flushing of logs
      this.flushIntervalId = window.setInterval(() => {
        this.flush();
      }, FLUSH_INTERVAL_MS);
      
      // Flush logs when window is about to unload
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
      
      console.log('Logger client initialized');
    }
  }
  
  private connect(): void {
    try {
      if (this.ws) {
        this.ws.close();
      }
      
      this.ws = new WebSocket(WEBSOCKET_ENDPOINT);
      
      this.ws.onopen = () => {
        console.log('Connected to logging WebSocket server');
        this.isConnected = true;
        this.flush(); // Flush any pending logs
      };
      
      this.ws.onclose = () => {
        console.log('Disconnected from logging WebSocket server. Reconnecting...');
        this.isConnected = false;
        
        // Schedule reconnection
        if (this.reconnectTimeoutId === null) {
          this.reconnectTimeoutId = window.setTimeout(() => {
            this.reconnectTimeoutId = null;
            this.connect();
          }, RECONNECT_INTERVAL_MS);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnected = false;
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket server:', error);
    }
  }
  
  log(level: LogLevel, context: string, message: string, data?: any): void {
    // Always log to console for convenience
    // Choose appropriate console method based on level
    const consoleMethods: Record<LogLevel, keyof Console> = {
      debug: 'debug',
      info: 'info',
      warn: 'warn',
      error: 'error',
      success: 'log',
      music: 'log',
      piano: 'log',
      api: 'log',
      performance: 'log'
    };
    
    const consoleMethod = consoleMethods[level] || 'log';
    console[consoleMethod](`[${context}] ${message}`, data);
    
    // Create log entry for remote
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      data
    };
    
    // Add to queue
    this.logQueue.push(entry);
    
    // Flush if batch size reached
    if (this.logQueue.length >= BATCH_SIZE) {
      this.flush();
    }
  }
  
  flush(): void {
    if (this.logQueue.length === 0) return;
    
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const logs = [...this.logQueue];
      this.logQueue = [];
      
      try {
        // Send each log individually for better processing on the server
        logs.forEach(log => {
          this.ws?.send(JSON.stringify(log));
        });
      } catch (error) {
        console.error('Failed to send logs to WebSocket:', error);
        // Put logs back in queue
        this.logQueue = [...logs, ...this.logQueue];
      }
    }
  }
  
  // Clean up on shutdown
  destroy(): void {
    if (typeof window !== 'undefined') {
      if (this.flushIntervalId !== null) {
        window.clearInterval(this.flushIntervalId);
        this.flushIntervalId = null;
      }
      
      if (this.reconnectTimeoutId !== null) {
        window.clearTimeout(this.reconnectTimeoutId);
        this.reconnectTimeoutId = null;
      }
      
      // Close the WebSocket
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      
      // Flush any remaining logs
      this.flush();
    }
  }
}

// Export a singleton instance
export const loggerClient = new LoggerClient();