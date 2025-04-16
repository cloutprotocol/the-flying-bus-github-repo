
/**
 * Logger Configuration
 * Configuration settings for the logging system
 */

import { LoggerConfig, LogLevel } from './types';

// Default configuration
export const defaultConfig: LoggerConfig = {
  minLevel: LogLevel.INFO,
  consoleOutput: true,
  toastOutput: false,
  persistToStorage: false,
  sendToServer: true
};

// Current configuration (initialized with default)
let currentConfig: LoggerConfig = { ...defaultConfig };

/**
 * Configure the logger
 */
export function configureLogger(newConfig: Partial<LoggerConfig>): void {
  currentConfig = { ...currentConfig, ...newConfig };
}

/**
 * Get the current logger configuration
 */
export function getLoggerConfig(): LoggerConfig {
  return { ...currentConfig };
}
