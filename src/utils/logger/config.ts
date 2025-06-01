
/**
 * Logger Configuration
 * Configuration settings for the logging system
 */

import { LoggerConfig, LogLevel } from './types';

// Default configuration
export const defaultConfig: LoggerConfig = {
  minLevel: LogLevel.DEBUG, // Changed to DEBUG for development
  consoleOutput: true,
  toastOutput: false, // Keep false to avoid spam during development
  persistToStorage: true, // Enable storage for debugging
  sendToServer: false, // Disable server logging during development
  maxStorageEntries: 500 // Increased for better debugging
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

/**
 * Configure logger for production environment
 */
export function configureForProduction(): void {
  configureLogger({
    minLevel: LogLevel.WARN,
    consoleOutput: false,
    toastOutput: true,
    persistToStorage: true,
    sendToServer: true,
    maxStorageEntries: 100
  });
}

/**
 * Configure logger for development environment
 */
export function configureForDevelopment(): void {
  configureLogger({
    minLevel: LogLevel.DEBUG,
    consoleOutput: true,
    toastOutput: false,
    persistToStorage: true,
    sendToServer: false,
    maxStorageEntries: 500
  });
}
