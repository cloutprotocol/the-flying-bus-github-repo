import { describe, it, expect } from 'vitest';
import { UserFriendlyErrorGenerator } from '../userFriendlyErrors';

describe('UserFriendlyErrorGenerator', () => {
  const mockContext = {
    operation: 'form_submission',
    component: 'TestComponent',
    userAction: 'submit_form'
  };

  describe('generateFormSubmissionError', () => {
    it('handles network errors correctly', () => {
      const error = new TypeError('fetch failed');
      const result = UserFriendlyErrorGenerator.generateFormSubmissionError(error, mockContext);

      expect(result.title).toBe('Connection Problem');
      expect(result.message).toContain('Unable to connect to our servers');
      expect(result.retryable).toBe(true);
      expect(result.nextSteps).toContain('Check your internet connection');
    });

    it('handles timeout errors correctly', () => {
      const error = { message: 'Request timeout', code: 'TIMEOUT', timeout: 30 };
      const result = UserFriendlyErrorGenerator.generateFormSubmissionError(error, mockContext);

      expect(result.title).toBe('Request Timed Out');
      expect(result.message).toContain('taking longer than expected');
      expect(result.retryable).toBe(true);
      expect(result.retryLabel).toBe('Retry Now');
    });

    it('handles validation errors correctly', () => {
      const error = { status: 400, message: 'Validation failed' };
      const result = UserFriendlyErrorGenerator.generateFormSubmissionError(error, mockContext);

      expect(result.title).toBe('Invalid Information');
      expect(result.message).toContain('check your information');
      expect(result.retryable).toBe(true);
      expect(result.nextSteps).toContain('Review all required fields');
    });

    it('handles rate limiting errors correctly', () => {
      const error = { status: 429, message: 'Too many requests' };
      const result = UserFriendlyErrorGenerator.generateFormSubmissionError(error, mockContext);

      expect(result.title).toBe('Too Many Requests');
      expect(result.message).toContain('too many requests recently');
      expect(result.retryable).toBe(true);
      expect(result.nextSteps).toContain('Wait 5-10 minutes before trying again');
    });

    it('handles server errors correctly', () => {
      const error = { status: 500, message: 'Internal server error' };
      const result = UserFriendlyErrorGenerator.generateFormSubmissionError(error, mockContext);

      expect(result.title).toBe('Server Problem');
      expect(result.message).toContain('servers are experiencing issues');
      expect(result.retryable).toBe(true);
    });

    it('handles authentication errors correctly', () => {
      const error = { status: 401, message: 'Unauthorized' };
      const result = UserFriendlyErrorGenerator.generateFormSubmissionError(error, mockContext);

      expect(result.title).toBe('Authentication Required');
      expect(result.message).toContain('need to be logged in');
      expect(result.retryable).toBe(false);
    });

    it('handles permission errors correctly', () => {
      const error = { status: 403, message: 'Forbidden' };
      const result = UserFriendlyErrorGenerator.generateFormSubmissionError(error, mockContext);

      expect(result.title).toBe('Permission Denied');
      expect(result.message).toContain('don\'t have permission');
      expect(result.retryable).toBe(false);
    });

    it('handles unknown errors with default message', () => {
      const error = { message: 'Unknown error' };
      const result = UserFriendlyErrorGenerator.generateFormSubmissionError(error, mockContext);

      expect(result.title).toBe('Something Went Wrong');
      expect(result.message).toContain('unexpected error occurred');
      expect(result.retryable).toBe(true);
    });
  });

  describe('generateDataLoadingError', () => {
    it('handles network errors correctly', () => {
      const error = new TypeError('fetch failed');
      const result = UserFriendlyErrorGenerator.generateDataLoadingError(error, mockContext);

      expect(result.title).toBe('Loading Failed');
      expect(result.message).toContain('Unable to load content');
      expect(result.retryable).toBe(true);
      expect(result.retryLabel).toBe('Reload Content');
    });

    it('handles timeout errors correctly', () => {
      const error = { message: 'Loading timeout' };
      const result = UserFriendlyErrorGenerator.generateDataLoadingError(error, mockContext);

      expect(result.title).toBe('Loading Timed Out');
      expect(result.message).toContain('taking too long to load');
      expect(result.retryable).toBe(true);
    });

    it('handles database errors correctly', () => {
      const error = { message: 'Database connection failed', code: 'PGRST001' };
      const result = UserFriendlyErrorGenerator.generateDataLoadingError(error, mockContext);

      expect(result.title).toBe('Data Unavailable');
      expect(result.message).toContain('Unable to retrieve');
      expect(result.retryable).toBe(true);
    });

    it('handles 404 errors correctly', () => {
      const error = { status: 404, message: 'Not found' };
      const result = UserFriendlyErrorGenerator.generateDataLoadingError(error, mockContext);

      expect(result.title).toBe('Content Not Found');
      expect(result.message).toContain('could not be found');
      expect(result.retryable).toBe(false);
    });

    it('handles unknown loading errors with default message', () => {
      const error = { message: 'Unknown loading error' };
      const result = UserFriendlyErrorGenerator.generateDataLoadingError(error, mockContext);

      expect(result.title).toBe('Loading Error');
      expect(result.message).toContain('Unable to load content');
      expect(result.retryable).toBe(true);
    });
  });

  describe('generateSuccessMessage', () => {
    it('generates form submission success message', () => {
      const result = UserFriendlyErrorGenerator.generateSuccessMessage('form_submission', mockContext);

      expect(result.title).toBe('Success!');
      expect(result.message).toContain('submitted successfully');
      expect(result.retryable).toBe(false);
      expect(result.nextSteps).toContain('Check your email for confirmation');
    });

    it('generates data loaded success message', () => {
      const result = UserFriendlyErrorGenerator.generateSuccessMessage('data_loaded', mockContext);

      expect(result.title).toBe('Content Loaded');
      expect(result.message).toContain('loaded successfully');
      expect(result.nextSteps).toContain('Browse the available content');
    });

    it('generates authentication success message', () => {
      const result = UserFriendlyErrorGenerator.generateSuccessMessage('authentication', mockContext);

      expect(result.title).toBe('Welcome!');
      expect(result.message).toContain('successfully logged in');
      expect(result.nextSteps).toContain('Explore your dashboard');
    });

    it('generates default success message for unknown operations', () => {
      const result = UserFriendlyErrorGenerator.generateSuccessMessage('unknown_operation', mockContext);

      expect(result.title).toBe('Success!');
      expect(result.message).toContain('Operation completed successfully');
      expect(result.nextSteps).toContain('Continue with your next task');
    });
  });
});