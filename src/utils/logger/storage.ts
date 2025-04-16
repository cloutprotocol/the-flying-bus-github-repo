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

/**
 * Persist log to localStorage
 */
export function persistLogToStorage(entry: LogEntry): void {
  try {
    const logs = JSON.parse(localStorage.getItem('app_logs') || '[]');
    logs.push(entry);
    
    // Keep only the last 100 logs to prevent storage overflow
    if (logs.length > 100) {
      logs.shift();
    }
    
    localStorage.setItem('app_logs', JSON.stringify(logs));
  } catch (error) {
    console.error('Failed to persist log to localStorage:', error);
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
  } catch (error) {
    console.error('Failed to clear logs from localStorage:', error);
  }
}

/**
 * Add a log entry to the buffer for batch processing
 */
function addToLogBuffer(entry: LogEntry): void {
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
    
    // Since there's no 'logs' table yet, we'll store in localStorage
    const existingLogs = getLogsFromStorage();
    localStorage.setItem('app_logs', JSON.stringify([...existingLogs, ...processedLogs]));
    
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
    
    // Also persist locally for immediate access
    persistLogToStorage(entry);
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
}
