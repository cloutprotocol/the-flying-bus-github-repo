
/**
 * Logger Storage
 * Functions for storing logs locally and remotely
 */

import { supabase } from '@/integrations/supabase/client';
import { LogEntry, LogLevel } from './types';

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
 * Send log to server
 * Note: Currently disabled until a logs table is created in the database
 */
export async function sendLogToServer(entry: LogEntry): Promise<void> {
  try {
    // Check if auth session exists to get user ID
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    // Add user ID to log entry if available
    if (userId) {
      entry = { ...entry, userId };
    }

    // Add browser information
    entry = {
      ...entry,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Since there's no 'logs' table, we'll store in article_views for now
    // with minimal information as a fallback
    if (entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL) {
      // Only log errors and fatal errors to article_views as a temporary solution
      // This is just a fallback mechanism until a proper logs table is created
      await supabase.from('article_views').insert({
        article_id: 'system-log', // Special identifier for system logs
        ip_address: entry.level, // Misusing this field to store log level
      });
    }
    
    // Rest of logs are stored in localStorage
    persistLogToStorage(entry);
  } catch (error) {
    // Fallback to console if everything fails
    console.error('Error in logging system:', error);
    // Ensure logs are at least stored locally
    persistLogToStorage(entry);
  }
}
