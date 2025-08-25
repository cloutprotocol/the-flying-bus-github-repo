import { dataLoadingManager, QueryOptions, QueryResult } from './dataLoadingManager';
import { authStateBuffer } from './authStateBuffer';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface ExecutorOptions extends QueryOptions {
  retryCount?: number;
  timeout?: number;
  priority?: 'low' | 'normal' | 'high';
}

export interface QueryExecution<T = any> {
  id: string;
  options: ExecutorOptions;
  promise: Promise<QueryResult<T>>;
  startTime: number;
  status: 'pending' | 'completed' | 'failed' | 'timeout';
}

class QueryExecutor {
  private executions = new Map<string, QueryExecution>();
  private queue: QueryExecution[] = [];
  private isProcessing = false;
  private readonly MAX_CONCURRENT = 5;
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds

  /**
   * Execute a query with protection from auth interference
   */
  async executeQuery<T = any>(options: ExecutorOptions): Promise<QueryResult<T>> {
    const queryId = uuidv4();
    const execution = this.createExecution<T>(queryId, options);
    
    this.executions.set(queryId, execution);
    
    // Register with auth state buffer for protection
    authStateBuffer.registerQuery(queryId);
    
    try {
      const result = await this.processExecution(execution);
      execution.status = 'completed';
      return result;
    } catch (error) {
      execution.status = 'failed';
      logger.error('Query execution failed', { queryId, error, options });
      throw error;
    } finally {
      // Always unregister from auth state buffer
      authStateBuffer.unregisterQuery(queryId);
      this.executions.delete(queryId);
    }
  }

  /**
   * Execute multiple queries concurrently with auth protection
   */
  async executeQueries<T = any>(queries: ExecutorOptions[]): Promise<QueryResult<T>[]> {
    const executions = queries.map(options => {
      const queryId = uuidv4();
      const execution = this.createExecution<T>(queryId, options);
      this.executions.set(queryId, execution);
      authStateBuffer.registerQuery(queryId);
      return execution;
    });

    try {
      const results = await Promise.allSettled(
        executions.map(execution => this.processExecution(execution))
      );

      return results.map((result, index) => {
        const execution = executions[index];
        if (result.status === 'fulfilled') {
          execution.status = 'completed';
          return result.value;
        } else {
          execution.status = 'failed';
          logger.error('Batch query execution failed', { 
            queryId: execution.id, 
            error: result.reason,
            options: execution.options 
          });
          return {
            data: null,
            error: result.reason,
            executionMode: 'fallback' as const
          };
        }
      });
    } finally {
      // Clean up all executions
      executions.forEach(execution => {
        authStateBuffer.unregisterQuery(execution.id);
        this.executions.delete(execution.id);
      });
    }
  }

  /**
   * Create a query execution
   */
  private createExecution<T>(queryId: string, options: ExecutorOptions): QueryExecution<T> {
    const timeout = options.timeout || this.DEFAULT_TIMEOUT;
    
    const promise = Promise.race([
      dataLoadingManager.executeQuery<T>(options),
      new Promise<QueryResult<T>>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Query timeout after ${timeout}ms`));
        }, timeout);
      })
    ]);

    return {
      id: queryId,
      options,
      promise,
      startTime: Date.now(),
      status: 'pending'
    };
  }

  /**
   * Process a query execution with retry logic
   */
  private async processExecution<T>(execution: QueryExecution<T>): Promise<QueryResult<T>> {
    const maxRetries = execution.options.retryCount || 2;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Create a new execution for each retry
        const currentExecution = attempt === 0 ? execution : this.createExecution<T>(execution.id, execution.options);
        const result = await currentExecution.promise;
        
        // If we got data or it's the final attempt, return the result
        if (result.data || attempt === maxRetries) {
          return result;
        }
        
        // If no data and we have retries left, wait and retry
        if (attempt < maxRetries) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
          logger.info('Retrying query execution', { 
            queryId: execution.id, 
            attempt: attempt + 1,
            maxRetries 
          });
        }
        
        lastError = result.error;
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          await this.delay(Math.pow(2, attempt) * 1000);
          logger.info('Retrying failed query execution', { 
            queryId: execution.id, 
            attempt: attempt + 1,
            error: error.message 
          });
        }
      }
    }

    // All retries exhausted
    throw lastError || new Error('Query execution failed after all retries');
  }

  /**
   * Get articles with fallback mechanisms
   */
  async getArticles(filters?: Record<string, any>): Promise<QueryResult> {
    return this.executeQuery({
      table: 'articles',
      select: `
        *,
        categories (
          id,
          name,
          slug,
          color
        ),
        profiles (
          id,
          username,
          full_name
        )
      `,
      filters: {
        status: 'published',
        ...filters
      },
      orderBy: { column: 'created_at', ascending: false },
      limit: 20,
      priority: 'high'
    });
  }

  /**
   * Get categories with fallback mechanisms
   */
  async getCategories(): Promise<QueryResult> {
    return this.executeQuery({
      table: 'categories',
      select: '*',
      orderBy: { column: 'name', ascending: true },
      priority: 'normal'
    });
  }

  /**
   * Get featured articles with fallback mechanisms
   */
  async getFeaturedArticles(): Promise<QueryResult> {
    return this.executeQuery({
      table: 'articles',
      select: `
        *,
        categories (
          id,
          name,
          slug,
          color
        ),
        profiles (
          id,
          username,
          full_name
        )
      `,
      filters: {
        status: 'published',
        featured: true
      },
      orderBy: { column: 'created_at', ascending: false },
      limit: 5,
      priority: 'high'
    });
  }

  /**
   * Get user-specific data (requires auth)
   */
  async getUserData(userId: string): Promise<QueryResult> {
    return this.executeQuery({
      table: 'profiles',
      select: '*',
      filters: { id: userId },
      requireAuth: true,
      priority: 'normal'
    });
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current execution statistics
   */
  getExecutionStats() {
    const executions = Array.from(this.executions.values());
    
    return {
      total: executions.length,
      pending: executions.filter(e => e.status === 'pending').length,
      completed: executions.filter(e => e.status === 'completed').length,
      failed: executions.filter(e => e.status === 'failed').length,
      averageExecutionTime: this.calculateAverageExecutionTime(executions)
    };
  }

  /**
   * Calculate average execution time for completed queries
   */
  private calculateAverageExecutionTime(executions: QueryExecution[]): number {
    const completed = executions.filter(e => e.status === 'completed');
    if (completed.length === 0) return 0;

    const totalTime = completed.reduce((sum, execution) => {
      return sum + (Date.now() - execution.startTime);
    }, 0);

    return totalTime / completed.length;
  }

  /**
   * Cancel all pending executions
   */
  cancelAllExecutions(): void {
    this.executions.forEach((execution, queryId) => {
      if (execution.status === 'pending') {
        authStateBuffer.unregisterQuery(queryId);
        execution.status = 'failed';
      }
    });
    
    this.executions.clear();
    logger.info('All query executions cancelled');
  }
}

export const queryExecutor = new QueryExecutor();