export interface ErrorContext {
  operation: string;
  component?: string;
  userAction?: string;
}

export interface UserFriendlyError {
  title: string;
  message: string;
  details?: string;
  nextSteps?: string[];
  retryable: boolean;
  retryLabel?: string;
}

export class UserFriendlyErrorGenerator {
  static generateFormSubmissionError(error: any, context: ErrorContext): UserFriendlyError {
    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        title: 'Connection Problem',
        message: 'Unable to connect to our servers. Please check your internet connection.',
        details: `Network error: ${error.message}`,
        nextSteps: [
          'Check your internet connection',
          'Try refreshing the page',
          'Contact support if the problem persists'
        ],
        retryable: true,
        retryLabel: 'Try Again'
      };
    }

    // Timeout errors
    if (error.message?.includes('timeout') || error.code === 'TIMEOUT') {
      return {
        title: 'Request Timed Out',
        message: 'Your request is taking longer than expected. This might be due to high server load.',
        details: `Timeout after ${error.timeout || 30}s`,
        nextSteps: [
          'Wait a moment and try again',
          'Check your internet connection',
          'Try again during off-peak hours'
        ],
        retryable: true,
        retryLabel: 'Retry Now'
      };
    }

    // Validation errors
    if (error.status === 400 || error.message?.includes('validation')) {
      return {
        title: 'Invalid Information',
        message: 'Please check your information and try again.',
        details: error.message || 'Validation failed',
        nextSteps: [
          'Review all required fields',
          'Ensure email format is correct',
          'Check for any error messages above form fields'
        ],
        retryable: true,
        retryLabel: 'Fix and Submit'
      };
    }

    // Rate limiting
    if (error.status === 429 || error.message?.includes('rate limit')) {
      return {
        title: 'Too Many Requests',
        message: 'You\'ve made too many requests recently. Please wait before trying again.',
        details: `Rate limited: ${error.message}`,
        nextSteps: [
          'Wait 5-10 minutes before trying again',
          'Avoid clicking submit multiple times',
          'Contact support if you need immediate assistance'
        ],
        retryable: true,
        retryLabel: 'Try Again Later'
      };
    }

    // Server errors
    if (error.status >= 500 || error.message?.includes('server error')) {
      return {
        title: 'Server Problem',
        message: 'Our servers are experiencing issues. We\'re working to fix this.',
        details: `Server error ${error.status}: ${error.message}`,
        nextSteps: [
          'Try again in a few minutes',
          'Check our status page for updates',
          'Contact support if urgent'
        ],
        retryable: true,
        retryLabel: 'Retry'
      };
    }

    // Authentication errors
    if (error.status === 401 || error.message?.includes('unauthorized')) {
      return {
        title: 'Authentication Required',
        message: 'You need to be logged in to perform this action.',
        details: `Auth error: ${error.message}`,
        nextSteps: [
          'Log in to your account',
          'Refresh the page if already logged in',
          'Clear browser cache if problems persist'
        ],
        retryable: false,
        retryLabel: 'Log In'
      };
    }

    // Permission errors
    if (error.status === 403 || error.message?.includes('forbidden')) {
      return {
        title: 'Permission Denied',
        message: 'You don\'t have permission to perform this action.',
        details: `Permission error: ${error.message}`,
        nextSteps: [
          'Contact an administrator for access',
          'Verify you\'re using the correct account',
          'Check if your account needs activation'
        ],
        retryable: false
      };
    }

    // Default error
    return {
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred. Please try again or contact support.',
      details: error.message || 'Unknown error',
      nextSteps: [
        'Try the action again',
        'Refresh the page',
        'Contact support with the error details'
      ],
      retryable: true,
      retryLabel: 'Try Again'
    };
  }

  static generateDataLoadingError(error: any, context: ErrorContext): UserFriendlyError {
    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        title: 'Loading Failed',
        message: 'Unable to load content. Please check your connection.',
        details: `Network error: ${error.message}`,
        nextSteps: [
          'Check your internet connection',
          'Refresh the page',
          'Try again in a moment'
        ],
        retryable: true,
        retryLabel: 'Reload Content'
      };
    }

    // Timeout errors
    if (error.message?.includes('timeout')) {
      return {
        title: 'Loading Timed Out',
        message: 'Content is taking too long to load.',
        details: `Timeout loading ${context.operation}`,
        nextSteps: [
          'Try reloading the content',
          'Check your internet speed',
          'Try again later if servers are busy'
        ],
        retryable: true,
        retryLabel: 'Reload'
      };
    }

    // Database errors
    if (error.message?.includes('database') || error.code?.includes('PGRST')) {
      return {
        title: 'Data Unavailable',
        message: 'Unable to retrieve the requested information.',
        details: `Database error: ${error.message}`,
        nextSteps: [
          'Try refreshing the page',
          'Check back in a few minutes',
          'Contact support if this persists'
        ],
        retryable: true,
        retryLabel: 'Retry Loading'
      };
    }

    // Not found errors
    if (error.status === 404) {
      return {
        title: 'Content Not Found',
        message: 'The requested content could not be found.',
        details: `404 error: ${context.operation}`,
        nextSteps: [
          'Check the URL is correct',
          'Go back to the previous page',
          'Use the navigation menu to find content'
        ],
        retryable: false
      };
    }

    // Default loading error
    return {
      title: 'Loading Error',
      message: 'Unable to load content at this time.',
      details: error.message || 'Unknown loading error',
      nextSteps: [
        'Try reloading the content',
        'Refresh the entire page',
        'Contact support if the problem continues'
      ],
      retryable: true,
      retryLabel: 'Try Again'
    };
  }

  static generateSuccessMessage(operation: string, context: ErrorContext): UserFriendlyError {
    switch (operation) {
      case 'form_submission':
        return {
          title: 'Success!',
          message: 'Your request has been submitted successfully.',
          nextSteps: [
            'Check your email for confirmation',
            'You can close this page or continue browsing',
            'We\'ll notify you when your request is processed'
          ],
          retryable: false
        };

      case 'data_loaded':
        return {
          title: 'Content Loaded',
          message: 'All content has been loaded successfully.',
          nextSteps: [
            'Browse the available content',
            'Use filters to find specific items',
            'Bookmark this page for easy access'
          ],
          retryable: false
        };

      case 'authentication':
        return {
          title: 'Welcome!',
          message: 'You have been successfully logged in.',
          nextSteps: [
            'Explore your dashboard',
            'Update your profile if needed',
            'Check out the latest content'
          ],
          retryable: false
        };

      default:
        return {
          title: 'Success!',
          message: 'Operation completed successfully.',
          nextSteps: [
            'Continue with your next task',
            'Check the results',
            'Contact support if you have questions'
          ],
          retryable: false
        };
    }
  }
}