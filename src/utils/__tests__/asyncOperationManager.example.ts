/**
 * Example usage of AsyncOperationManager
 * This file demonstrates how to use the AsyncOperationManager in real scenarios
 */

import { AsyncOperationManager } from '../asyncOperationManager';

// Example 1: Form submission with retry logic
export async function submitFormWithRetry(formData: any) {
  const result = await AsyncOperationManager.executeWithRetry(
    async (signal) => {
      // Simulate API call
      const response = await fetch('/api/submit-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        signal // Pass the abort signal to fetch
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    {
      timeout: 30000, // 30 second timeout
      maxRetries: 2,  // Retry up to 2 times
      retryDelay: 1000, // Start with 1 second delay
      exponentialBackoff: true,
      operationId: 'form-submission',
      onProgress: (step, attempt) => {
        console.log(`Form submission: ${step}`, attempt ? `(attempt ${attempt})` : '');
      },
      onError: (error, attempt, willRetry) => {
        console.error(`Form submission failed on attempt ${attempt}:`, error.message);
        if (willRetry) {
          console.log('Will retry...');
        }
      },
      onSuccess: (result, attempt) => {
        console.log(`Form submitted successfully on attempt ${attempt}`, result);
      }
    }
  );

  if (result.success) {
    console.log('Form submission completed:', result.data);
    return result.data;
  } else {
    console.error('Form submission failed:', result.error?.message);
    throw result.error;
  }
}

// Example 2: Data fetching with timeout
export async function fetchDataWithTimeout(url: string) {
  const result = await AsyncOperationManager.executeWithRetry(
    async (signal) => {
      const response = await fetch(url, { signal });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      return response.json();
    },
    {
      timeout: 10000, // 10 second timeout
      maxRetries: 3,
      retryDelay: 500,
      operationId: `fetch-${url}`,
      onProgress: (step) => console.log(`Fetching ${url}: ${step}`)
    }
  );

  return result;
}

// Example 3: Using the form submission wrapper
export function createFormSubmitter() {
  return AsyncOperationManager.createFormSubmissionWrapper(
    async (formData: any, signal?: AbortSignal) => {
      // Your form submission logic here
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        signal
      });

      if (!response.ok) {
        throw new Error(`Submission failed: ${response.statusText}`);
      }

      return response.json();
    },
    {
      timeout: 30000,
      maxRetries: 2,
      onProgress: (step) => console.log(`Form: ${step}`),
      onError: (error, attempt, willRetry) => {
        console.error(`Form error (attempt ${attempt}):`, error.message);
        if (!willRetry) {
          // Show user-friendly error message
          alert('Form submission failed. Please try again.');
        }
      }
    }
  );
}

// Example 4: Using the data fetch wrapper
export function createDataFetcher(baseUrl: string) {
  return AsyncOperationManager.createDataFetchWrapper(
    async (signal?: AbortSignal) => {
      const response = await fetch(`${baseUrl}/data`, { signal });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return response.json();
    },
    {
      timeout: 5000,
      maxRetries: 3,
      retryDelay: 1000,
      onProgress: (step) => console.log(`Data fetch: ${step}`)
    }
  );
}

// Example 5: Cancelling operations
export class FormManager {
  private currentOperationId: string | null = null;

  async submitForm(formData: any) {
    // Cancel any existing operation
    if (this.currentOperationId) {
      AsyncOperationManager.cancelOperation(this.currentOperationId);
    }

    this.currentOperationId = `form-${Date.now()}`;

    try {
      const result = await AsyncOperationManager.executeWithRetry(
        async (signal) => {
          // Your submission logic
          const response = await fetch('/api/submit', {
            method: 'POST',
            body: JSON.stringify(formData),
            signal
          });
          return response.json();
        },
        {
          operationId: this.currentOperationId,
          timeout: 30000,
          maxRetries: 2
        }
      );

      this.currentOperationId = null;
      return result;
    } catch (error) {
      this.currentOperationId = null;
      throw error;
    }
  }

  cancelCurrentSubmission() {
    if (this.currentOperationId) {
      const cancelled = AsyncOperationManager.cancelOperation(this.currentOperationId);
      if (cancelled) {
        console.log('Form submission cancelled');
        this.currentOperationId = null;
      }
    }
  }
}

// Example 6: Component cleanup pattern
export class ComponentWithAsyncOperations {
  private operationIds: string[] = [];

  async performOperation(data: any) {
    const operationId = `component-op-${Date.now()}`;
    this.operationIds.push(operationId);

    const result = await AsyncOperationManager.executeWithRetry(
      async (signal) => {
        // Your async operation
        return await someAsyncOperation(data, signal);
      },
      {
        operationId,
        timeout: 15000,
        maxRetries: 2
      }
    );

    // Remove from tracking
    this.operationIds = this.operationIds.filter(id => id !== operationId);
    
    return result;
  }

  // Call this when component unmounts
  cleanup() {
    this.operationIds.forEach(operationId => {
      AsyncOperationManager.cancelOperation(operationId);
    });
    this.operationIds = [];
  }
}

// Mock function for example
async function someAsyncOperation(data: any, signal?: AbortSignal): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => resolve({ success: true, data }), 1000);
    
    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new Error('Operation cancelled'));
    });
  });
}