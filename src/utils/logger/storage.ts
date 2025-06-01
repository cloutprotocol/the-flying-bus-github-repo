/**
 * Logger Storage
 * Functions for storing logs locally and remotely
 */

import { supabase } from '@/integrations/supabase/client';
import { LogEntry, LogLevel } from './types';

// In-memory log buffer for batched processing
const logBuffer: LogEntry[] = [];
const MAX_BUFFER_SIZE = 20;
let isProcessingBuffer = false;
let storageErrorReported = false;

/**
 * Persist log to localStorage with better error handling
 */
export function persistLogToStorage(entry: LogEntry): void {
  try {
    // Skip if we've already had storage errors to prevent endless error loops
    if (storageErrorReported) {
      return;
    }
    
    const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
    
    // Keep only the most recent logs to prevent storage overflow
    while (logs.length >= 50) { // Reduced from 100 to 50
      logs.shift();
    }
    
    logs.push(entry);
    
    try {
      localStorage.setItem('app_logs', JSON.stringify(logs));
    } catch (storageError) {
      // If we can't write to localStorage, set a flag to prevent further attempts
      storageErrorReported = true;
      
      // Try to clear half of the logs and retry once
      const halfSize = Math.floor(logs.length / 2);
      const reducedLogs = logs.slice(halfSize);
      try {
        localStorage.setItem('app_logs', JSON.stringify(reducedLogs));
        storageErrorReported = false; // Reset flag if successful
      } catch (retryError) {
        // If retry fails, just give up and let logs go to console only
        console.error('Failed to persist logs to localStorage after cleanup attempt');
      }
    }
  } catch (error) {
    // Avoid calling logger functions here to prevent infinite recursion
    console.error('Failed to parse or process logs:', error);
  }
}

/**
 * Get all logs from localStorage
 */
export function getLogsFromStorage(): LogEntry[] {
  try {
    return JSON.parse(localStorage.getItem('app_logs') || '[]');
  } catch (error) {
    console.error('Failed to retrieve logs from localStorage:', error);
    return [];
  }
}

/**
 * Clear logs from localStorage
 */
export function clearLogsFromStorage(): void {
  try {
    localStorage.removeItem('app_logs');
    storageErrorReported = false; // Reset the error flag
  } catch (error) {
    console.error('Failed to clear logs from localStorage:', error);
  }
}

/**
 * Add a log entry to the buffer for batch processing
 */
function addToLogBuffer(entry: LogEntry): void {
  // If buffer is getting too large, drop older entries
  if (logBuffer.length >= MAX_BUFFER_SIZE * 2) {
    logBuffer.splice(0, MAX_BUFFER_SIZE / 2);
  }
  
  logBuffer.push(entry);
  
  // Process the buffer if it reaches the maximum size
  if (logBuffer.length >= MAX_BUFFER_SIZE) {
    void processLogBuffer();
  }
}

/**
 * Process the log buffer and send logs to the server
 */
async function processLogBuffer(): Promise<void> {
  if (isProcessingBuffer || logBuffer.length === 0) {
    return;
  }
  
  try {
    isProcessingBuffer = true;
    
    // Take a snapshot of the current buffer
    const logsToProcess = [...logBuffer];
    
    // Clear the entries we're about to process
    logBuffer.splice(0, logsToProcess.length);
    
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    // Add user info to all logs
    const processedLogs = logsToProcess.map(log => ({
      ...log,
      userId: userId || log.userId,
      url: window.location.href,
      userAgent: navigator.userAgent
    }));
    
    try {
      // Store only critical logs in localStorage to reduce space
      const criticalLogs = processedLogs.filter(
        log => log.level === LogLevel.ERROR || log.level === LogLevel.FATAL
      );
      
      if (criticalLogs.length > 0 && !storageErrorReported) {
        const existingLogs = getLogsFromStorage().filter(
          // Keep only logs from the last hour to save space
          log => new Date(log.timestamp).getTime() > Date.now() - 3600000
        );
        
        localStorage.setItem('app_logs', JSON.stringify([...existingLogs, ...criticalLogs]));
      }
    } catch (storageError) {
      storageErrorReported = true;
      console.error('Error storing logs in localStorage:', storageError);
    }
    
    // Only send errors and fatal logs to the server as a fallback
    const errorLogs = processedLogs.filter(
      log => log.level === LogLevel.ERROR || log.level === LogLevel.FATAL
    );
    
    if (errorLogs.length > 0) {
      // Store error logs in article_views as a temporary solution
      // This is just a fallback until a proper logs table is created
      await Promise.all(errorLogs.map(log => 
        supabase.from('article_views').insert({
          article_id: 'system-log', // Special identifier for system logs
          ip_address: log.level, // Misusing this field to store log level
          user_id: log.userId
        }).then(null, () => {
          // Silently handle failure - we don't want to cause more errors from logging
        })
      ));
    }
    
  } catch (error) {
    console.error('Error processing log buffer:', error);
  } finally {
    isProcessingBuffer = false;
  }
}

/**
 * Send log to server
 */
export async function sendLogToServer(entry: LogEntry): Promise<void> {
  try {
    // Add to buffer for batch processing
    addToLogBuffer(entry);
    
    // Only persist critical logs locally
    if ((entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL) && !storageErrorReported) {
      persistLogToStorage(entry);
    }
  } catch (error) {
    // Fallback to console if everything fails
    console.error('Error in logging system:', error);
  }
}

// Set up periodic flushing of the log buffer (every 30 seconds)
if (typeof window !== 'undefined') {
  setInterval(() => {
    void processLogBuffer();
  }, 30000);
  
  // Also set up periodic cleaning of localStorage logs (every 5 minutes)
  setInterval(() => {
    try {
      if (storageErrorReported) {
        // Try to recover by clearing logs completely
        clearLogsFromStorage();
      } else {
        // Just trim old logs
        const logs = getLogsFromStorage().filter(
          log => new Date(log.timestamp).getTime() > Date.now() - 3600000 // Keep last hour
        );
        localStorage.setItem('app_logs', JSON.stringify(logs));
      }
    } catch (error) {
      storageErrorReported = true;
    }
  }, 300000);
}
