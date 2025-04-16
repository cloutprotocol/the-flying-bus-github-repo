/**
 * Logger Utility
 * Centralized logging system for the application
 */

// Log sources
export enum LogSource {
  APP = 'app',
  API = 'api',
  AUTH = 'auth',
  DATABASE = 'database',
  EDITOR = 'editor',
  MEDIA = 'media',
  MODERATION = 'moderation',
  SAFETY = 'safety'
}

// Log severity levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// Logger interface
export interface Logger {
  debug(source: LogSource, message: string, data?: any): void;
  info(source: LogSource, message: string, data?: any): void;
  warn(source: LogSource, message: string, data?: any): void;
  error(source: LogSource, message: string, data?: any): void;
  log(level: LogLevel, source: LogSource, message: string, data?: any): void;
}

// Implementation
class AppLogger implements Logger {
  // Current log level (can be configured)
  private currentLevel: LogLevel = LogLevel.INFO;
  
  // Enable/disable logging to console
  private isConsoleEnabled = true;
  
  // Enable/disable sending logs to server
  private isServerLoggingEnabled = false;
  
  // Max number of logs to keep in memory
  private readonly MAX_LOG_BUFFER = 100;
  
  // In-memory log buffer
  private logBuffer: Array<{
    timestamp: Date;
    level: LogLevel;
    source: LogSource;
    message: string;
    data?: any;
  }> = [];
  
  constructor() {
    // Detect environment and adjust logging settings
    if (process.env.NODE_ENV === 'development') {
      this.currentLevel = LogLevel.DEBUG;
    } else {
      this.isConsoleEnabled = false;
      this.isServerLoggingEnabled = true;
    }
  }
  
  // Set log level
  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }
  
  // Enable/disable console logging
  enableConsole(enabled: boolean): void {
    this.isConsoleEnabled = enabled;
  }
  
  // Enable/disable server logging
  enableServerLogging(enabled: boolean): void {
    this.isServerLoggingEnabled = enabled;
  }
  
  // Main log method
  log(level: LogLevel, source: LogSource, message: string, data?: any): void {
    // Skip if log level is below current level
    if (!this.shouldLog(level)) return;
    
    const timestamp = new Date();
    const logEntry = { timestamp, level, source, message, data };
    
    // Add to in-memory buffer (for potential sending later)
    this.addToBuffer(logEntry);
    
    // Log to console if enabled
    if (this.isConsoleEnabled) {
      this.logToConsole(level, source, message, timestamp, data);
    }
    
    // Send to server if enabled and level is WARN or ERROR
    if (this.isServerLoggingEnabled && (level === LogLevel.WARN || level === LogLevel.ERROR)) {
      this.sendLogToServer(logEntry);
    }
  }
  
  // Convenience methods
  debug(source: LogSource, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, source, message, data);
  }
  
  info(source: LogSource, message: string, data?: any): void {
    this.log(LogLevel.INFO, source, message, data);
  }
  
  warn(source: LogSource, message: string, data?: any): void {
    this.log(LogLevel.WARN, source, message, data);
  }
  
  error(source: LogSource, message: string, data?: any): void {
    this.log(LogLevel.ERROR, source, message, data);
  }
  
  // Check if we should log based on current level
  private shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel);
    const currentLevelIndex = levels.indexOf(this.currentLevel);
    const logLevelIndex = levels.indexOf(level);
    
    return logLevelIndex >= currentLevelIndex;
  }
  
  // Add log to in-memory buffer
  private addToBuffer(logEntry: any): void {
    this.logBuffer.push(logEntry);
    
    // Ensure buffer doesn't exceed max size
    if (this.logBuffer.length > this.MAX_LOG_BUFFER) {
      this.logBuffer.shift();
    }
  }
  
  // Log to console with appropriate colors
  private logToConsole(
    level: LogLevel, 
    source: LogSource, 
    message: string, 
    timestamp: Date, 
    data?: any
  ): void {
    const time = timestamp.toISOString();
    const formattedSource = `[${source.toUpperCase()}]`;
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`${time} ${formattedSource} ${message}`, data || '');
        break;
      case LogLevel.INFO:
        console.info(`${time} ${formattedSource} ${message}`, data || '');
        break;
      case LogLevel.WARN:
        console.warn(`${time} ${formattedSource} ${message}`, data || '');
        break;
      case LogLevel.ERROR:
        console.error(`${time} ${formattedSource} ${message}`, data || '');
        break;
    }
  }
  
  // Send log to server (for errors and warnings)
  private sendLogToServer(logEntry: any): void {
    // In a real implementation, this would send logs to a server endpoint
    // For now, we'll just store it in the buffer
    
    // Mock implementation:
    // setTimeout(() => {
    //   fetch('/api/logs', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(logEntry)
    //   }).catch(err => {
    //     // Log to console if server logging fails
    //     this.isConsoleEnabled && console.error('Failed to send log to server:', err);
    //   });
    // }, 0);
  }
  
  // Get all logs for a specific level and/or source
  getLogs(level?: LogLevel, source?: LogSource): any[] {
    return this.logBuffer.filter(entry => {
      const levelMatch = !level || entry.level === level;
      const sourceMatch = !source || entry.source === source;
      return levelMatch && sourceMatch;
    });
  }
  
  // Clear logs
  clearLogs(): void {
    this.logBuffer = [];
  }
}

// Export singleton instance
const logger = new AppLogger();
export default logger;
