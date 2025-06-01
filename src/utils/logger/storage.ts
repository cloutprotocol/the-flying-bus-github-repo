
/**
 * Logger Storage
 * Functions for persisting and retrieving logs
 */

import { LogEntry } from './types';
import { getLoggerConfig } from './config';

const LOG_STORAGE_KEY = 'app_logs';

/**
 * Persist log entry to localStorage
 */
export function persistLogToStorage(entry: LogEntry): void {
  try {
    const config = getLoggerConfig();
    const stored = localStorage.getItem(LOG_STORAGE_KEY);
    const logs: LogEntry[] = stored ? JSON.parse(stored) : [];
    
    // Add the new log entry
    logs.push(entry);
    
    // Trim to max entries if configured
    if (config.maxStorageEntries && logs.length > config.maxStorageEntries) {
      logs.splice(0, logs.length - config.maxStorageEntries);
    }
    
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
  } catch (error) {
    // Fallback to console if localStorage fails
    console.warn('[LOGGER] Failed to persist log to storage:', error);
  }
}

/**
 * Retrieve logs from localStorage
 */
export function getStoredLogs(): LogEntry[] {
  try {
    const stored = localStorage.getItem(LOG_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('[LOGGER] Failed to retrieve logs from storage:', error);
    return [];
  }
}

/**
 * Clear all stored logs
 */
export function clearStoredLogs(): void {
  try {
    localStorage.removeItem(LOG_STORAGE_KEY);
  } catch (error) {
    console.warn('[LOGGER] Failed to clear stored logs:', error);
  }
}

/**
 * Send log to server (placeholder implementation)
 */
export async function sendLogToServer(entry: LogEntry): Promise<void> {
  // TODO: Implement server logging when backend endpoint is available
  // For now, this is a no-op function
  
  // Example implementation:
  // try {
  //   await fetch('/api/logs', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(entry)
  //   });
  // } catch (error) {
  //   console.warn('[LOGGER] Failed to send log to server:', error);
  // }
}
