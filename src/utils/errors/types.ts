
/**
 * API Error types
 * Types and classes for structured error handling
 */

/**
 * API Error types enum
 */
export enum ApiErrorType {
  NETWORK = 'network',
  AUTH = 'auth',
  VALIDATION = 'validation',
  SERVER = 'server',
  NOTFOUND = 'not_found',
  UNKNOWN = 'unknown'
}

/**
 * API Error class for structured error handling
 */
export class ApiError extends Error {
  type: ApiErrorType;
  status?: number;
  details?: any;

  constructor(message: string, type: ApiErrorType, status?: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.status = status;
    this.details = details;
  }
}
