import { logger } from '@/utils/logger';
import { dataLoadingManager } from './dataLoadingManager';

export interface AuthStateChange {
  type: 'session_start' | 'session_end' | 'profile_loading' | 'profile_loaded' | 'profile_error';
  timestamp: number;
  data?: any;
}

export interface BufferConfig {
  bufferDuration: number; // ms to buffer auth state changes
  maxBufferSize: number;
  interferenceThreshold: number; // number of changes that indicate interference
}

class AuthStateBuffer {
  private buffer: AuthStateChange[] = [];
  private bufferTimer: NodeJS.Timeout | null = null;
  private isBuffering = false;
  
  private config: BufferConfig = {
    bufferDuration: 1000, // 1 second buffer
    maxBufferSize: 10,
    interferenceThreshold: 3
  };

  private ongoingQueries = new Set<string>();

  /**
   * Buffer an auth state change to prevent interference with data loading
   */
  bufferStateChange(change: AuthStateChange): void {
    this.buffer.push(change);
    
    // Trim buffer if it gets too large
    if (this.buffer.length > this.config.maxBufferSize) {
      this.buffer = this.buffer.slice(-this.config.maxBufferSize);
    }

    // Check for interference patterns
    this.detectInterference();

    // Start or reset buffer timer
    this.startBufferTimer();

    logger.debug('Auth state change buffered', { change, bufferSize: this.buffer.length });
  }

  /**
   * Register an ongoing query to protect from auth interference
   */
  registerQuery(queryId: string): void {
    this.ongoingQueries.add(queryId);
    
    // If we have ongoing queries, enable buffering
    if (this.ongoingQueries.size > 0 && !this.isBuffering) {
      this.enableBuffering();
    }

    logger.debug('Query registered for protection', { queryId, totalQueries: this.ongoingQueries.size });
  }

  /**
   * Unregister a completed query
   */
  unregisterQuery(queryId: string): void {
    this.ongoingQueries.delete(queryId);
    
    // If no more ongoing queries, we can process buffered changes
    if (this.ongoingQueries.size === 0 && this.isBuffering) {
      this.processBufferedChanges();
    }

    logger.debug('Query unregistered', { queryId, remainingQueries: this.ongoingQueries.size });
  }

  /**
   * Enable auth state buffering
   */
  private enableBuffering(): void {
    this.isBuffering = true;
    dataLoadingManager.setAuthInterference(true);
    logger.info('Auth state buffering enabled');
  }

  /**
   * Disable auth state buffering
   */
  private disableBuffering(): void {
    this.isBuffering = false;
    dataLoadingManager.setAuthInterference(false);
    logger.info('Auth state buffering disabled');
  }

  /**
   * Start or reset the buffer timer
   */
  private startBufferTimer(): void {
    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer);
    }

    this.bufferTimer = setTimeout(() => {
      this.processBufferedChanges();
    }, this.config.bufferDuration);
  }

  /**
   * Process all buffered auth state changes
   */
  private processBufferedChanges(): void {
    if (this.buffer.length === 0) return;

    const changes = [...this.buffer];
    this.buffer = [];

    // Only process if no ongoing queries
    if (this.ongoingQueries.size === 0) {
      this.disableBuffering();
      
      // Process the most recent change of each type
      const latestChanges = this.getLatestChangesByType(changes);
      this.applyAuthStateChanges(latestChanges);
    }

    logger.debug('Buffered auth state changes processed', { 
      processedCount: changes.length,
      ongoingQueries: this.ongoingQueries.size 
    });
  }

  /**
   * Get the latest change for each type
   */
  private getLatestChangesByType(changes: AuthStateChange[]): AuthStateChange[] {
    const latestByType = new Map<string, AuthStateChange>();
    
    changes.forEach(change => {
      const existing = latestByType.get(change.type);
      if (!existing || change.timestamp > existing.timestamp) {
        latestByType.set(change.type, change);
      }
    });

    return Array.from(latestByType.values());
  }

  /**
   * Apply auth state changes to the system
   */
  private applyAuthStateChanges(changes: AuthStateChange[]): void {
    changes.forEach(change => {
      switch (change.type) {
        case 'session_start':
          this.handleSessionStart(change);
          break;
        case 'session_end':
          this.handleSessionEnd(change);
          break;
        case 'profile_loaded':
          this.handleProfileLoaded(change);
          break;
        case 'profile_error':
          this.handleProfileError(change);
          break;
      }
    });
  }

  /**
   * Handle session start
   */
  private handleSessionStart(change: AuthStateChange): void {
    logger.info('Processing buffered session start', { timestamp: change.timestamp });
    // Trigger any necessary session-dependent operations
    dataLoadingManager.preloadCriticalData();
  }

  /**
   * Handle session end
   */
  private handleSessionEnd(change: AuthStateChange): void {
    logger.info('Processing buffered session end', { timestamp: change.timestamp });
    // Clear any user-specific cached data
    dataLoadingManager.clearCache();
  }

  /**
   * Handle profile loaded
   */
  private handleProfileLoaded(change: AuthStateChange): void {
    logger.info('Processing buffered profile loaded', { timestamp: change.timestamp });
    // Profile is now available for user-specific queries
  }

  /**
   * Handle profile error
   */
  private handleProfileError(change: AuthStateChange): void {
    logger.warn('Processing buffered profile error', { timestamp: change.timestamp, error: change.data });
    // Continue with anonymous access
  }

  /**
   * Detect interference patterns in auth state changes
   */
  private detectInterference(): void {
    const recentChanges = this.buffer.filter(
      change => Date.now() - change.timestamp < this.config.bufferDuration
    );

    if (recentChanges.length >= this.config.interferenceThreshold) {
      logger.warn('Auth interference pattern detected', { 
        recentChanges: recentChanges.length,
        threshold: this.config.interferenceThreshold 
      });
      
      if (!this.isBuffering) {
        this.enableBuffering();
      }
    }
  }

  /**
   * Get current buffer state
   */
  getBufferState() {
    return {
      isBuffering: this.isBuffering,
      bufferSize: this.buffer.length,
      ongoingQueries: this.ongoingQueries.size,
      config: this.config
    };
  }

  /**
   * Update buffer configuration
   */
  updateConfig(newConfig: Partial<BufferConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Auth state buffer config updated', { config: this.config });
  }

  /**
   * Clear buffer and reset state
   */
  reset(): void {
    this.buffer = [];
    this.ongoingQueries.clear();
    
    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer);
      this.bufferTimer = null;
    }
    
    this.disableBuffering();
    logger.info('Auth state buffer reset');
  }
}

export const authStateBuffer = new AuthStateBuffer();