
/**
 * Logger Toast
 * Functions for showing toast notifications for logs
 */

import { toast } from '@/components/ui/use-toast';
import { LogEntry } from './types';

/**
 * Show toast notification for log
 */
export function showToastForLog(entry: LogEntry): void {
  const variant = entry.level === 'error' || entry.level === 'fatal' 
    ? 'destructive' 
    : entry.level === 'warn' 
    ? 'default' 
    : 'default';

  toast({
    title: `${entry.level.toUpperCase()}: ${entry.source}`,
    description: entry.message,
    variant
  });
}
