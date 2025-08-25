# User Feedback System

This directory contains the comprehensive user feedback system that provides better error communication, loading progress indicators, and success feedback throughout the application.

## Components

### UserFeedback Component

A versatile feedback component that displays different types of user messages with appropriate styling and functionality.

**Features:**
- Error messages with retry buttons
- Success messages with next steps
- Loading indicators with progress bars
- Info messages
- Technical details (collapsible)
- Estimated completion times
- User-friendly error messages

**Usage:**
```tsx
import { UserFeedback } from '@/components/Common/UserFeedback';

<UserFeedback
  type="error"
  title="Connection Problem"
  message="Unable to connect to our servers"
  details="Network error: fetch failed"
  showRetry={true}
  onRetry={handleRetry}
  retryLabel="Try Again"
  nextSteps={['Check your internet connection', 'Try refreshing the page']}
/>
```

## Hooks

### useUserFeedback Hook

A React hook that manages user feedback state and provides methods to show different types of feedback.

**Features:**
- State management for feedback messages
- Auto-clear success messages after 5 seconds
- Progress tracking for loading states
- Retry handler management
- Cleanup on component unmount

**Usage:**
```tsx
import { useUserFeedback } from '@/hooks/useUserFeedback';

const MyComponent = () => {
  const {
    feedback,
    showError,
    showSuccess,
    showLoading,
    updateProgress,
    clearFeedback,
    retry,
    setRetryHandler
  } = useUserFeedback();

  const handleSubmit = async () => {
    showLoading('Submitting...', { showProgress: true, progress: 0 });
    
    try {
      // Perform operation
      updateProgress(50, '15 seconds');
      const result = await submitData();
      updateProgress(100, 'Complete');
      
      showSuccess('Submitted successfully!', {
        nextSteps: ['Check your email', 'Continue browsing']
      });
    } catch (error) {
      showError('Submission failed', {
        showRetry: true,
        details: error.message
      });
    }
  };

  // Set up retry handler
  React.useEffect(() => {
    setRetryHandler(() => {
      handleSubmit();
    });
  }, []);

  return (
    <div>
      {feedback && (
        <UserFeedback
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          details={feedback.details}
          showRetry={feedback.showRetry}
          onRetry={retry}
          retryLabel={feedback.retryLabel}
          showProgress={feedback.showProgress}
          progress={feedback.progress}
          estimatedTime={feedback.estimatedTime}
          nextSteps={feedback.nextSteps}
        />
      )}
      {/* Your component content */}
    </div>
  );
};
```

## Utilities

### UserFriendlyErrorGenerator

A utility class that converts technical errors into user-friendly messages with appropriate next steps and retry options.

**Features:**
- Categorizes different error types
- Provides user-friendly titles and messages
- Suggests appropriate next steps
- Determines if errors are retryable
- Hides technical details from users

**Usage:**
```tsx
import { UserFriendlyErrorGenerator } from '@/utils/userFriendlyErrors';

try {
  await submitForm();
} catch (error) {
  const userError = UserFriendlyErrorGenerator.generateFormSubmissionError(error, {
    operation: 'form_submission',
    component: 'ContactForm',
    userAction: 'submit_contact_form'
  });
  
  showError(userError.message, {
    title: userError.title,
    details: userError.details,
    nextSteps: userError.nextSteps,
    showRetry: userError.retryable,
    retryLabel: userError.retryLabel
  });
}
```

**Error Types Handled:**
- Network errors (connection issues, fetch failures)
- Timeout errors (request timeouts, slow responses)
- Validation errors (form validation, input errors)
- Rate limiting errors (too many requests)
- Server errors (5xx status codes)
- Authentication errors (401 unauthorized)
- Permission errors (403 forbidden)
- Not found errors (404)
- Database errors (connection, query failures)

**Success Message Types:**
- Form submission success
- Data loading success
- Authentication success
- Generic operation success

## Integration Examples

### Form Submission with Progress

```tsx
const ContactForm = () => {
  const { feedback, showError, showSuccess, showLoading, updateProgress, setRetryHandler } = useUserFeedback();
  
  const handleSubmit = async (formData) => {
    showLoading('Submitting your message...', {
      showProgress: true,
      progress: 10,
      estimatedTime: '30 seconds'
    });
    
    try {
      updateProgress(30, '20 seconds');
      await validateForm(formData);
      
      updateProgress(60, '15 seconds');
      await submitToServer(formData);
      
      updateProgress(90, '5 seconds');
      await sendConfirmationEmail();
      
      updateProgress(100, 'Complete');
      
      const successMessage = UserFriendlyErrorGenerator.generateSuccessMessage('form_submission', {
        operation: 'contact_form',
        component: 'ContactForm'
      });
      
      showSuccess(successMessage.message, {
        title: successMessage.title,
        nextSteps: successMessage.nextSteps
      });
      
    } catch (error) {
      const userError = UserFriendlyErrorGenerator.generateFormSubmissionError(error, {
        operation: 'form_submission',
        component: 'ContactForm'
      });
      
      showError(userError.message, {
        title: userError.title,
        details: userError.details,
        nextSteps: userError.nextSteps,
        showRetry: userError.retryable,
        retryLabel: userError.retryLabel
      });
    }
  };
  
  setRetryHandler(() => handleSubmit(formData));
  
  return (
    <form onSubmit={handleSubmit}>
      {feedback && <UserFeedback {...feedback} onRetry={retry} />}
      {/* Form fields */}
    </form>
  );
};
```

### Data Loading with Error Recovery

```tsx
const ArticleList = () => {
  const { feedback, showError, showSuccess, showLoading, setRetryHandler } = useUserFeedback();
  const [articles, setArticles] = useState([]);
  
  const loadArticles = async () => {
    showLoading('Loading articles...', {
      showProgress: true,
      progress: 0,
      estimatedTime: '10 seconds'
    });
    
    try {
      updateProgress(50, '5 seconds');
      const data = await fetchArticles();
      updateProgress(100, 'Complete');
      
      setArticles(data);
      showSuccess('Articles loaded successfully!');
      
    } catch (error) {
      const userError = UserFriendlyErrorGenerator.generateDataLoadingError(error, {
        operation: 'article_loading',
        component: 'ArticleList'
      });
      
      showError(userError.message, {
        title: userError.title,
        details: userError.details,
        nextSteps: userError.nextSteps,
        showRetry: userError.retryable,
        retryLabel: userError.retryLabel
      });
    }
  };
  
  setRetryHandler(loadArticles);
  
  useEffect(() => {
    loadArticles();
  }, []);
  
  return (
    <div>
      {feedback && <UserFeedback {...feedback} onRetry={retry} />}
      {articles.map(article => <ArticleCard key={article.id} {...article} />)}
    </div>
  );
};
```

## Best Practices

1. **Always provide context**: Include operation, component, and user action in error context
2. **Use appropriate feedback types**: Error for failures, success for completions, loading for progress
3. **Provide actionable next steps**: Give users clear guidance on what to do next
4. **Hide technical details**: Show user-friendly messages, keep technical details collapsible
5. **Enable retry for recoverable errors**: Allow users to retry failed operations
6. **Show progress for long operations**: Use progress indicators for operations > 3 seconds
7. **Auto-clear success messages**: Success messages clear automatically after 5 seconds
8. **Set up retry handlers**: Always provide a way for users to retry failed operations

## Testing

The user feedback system includes comprehensive tests:

- Unit tests for individual components and hooks
- Integration tests for complete user flows
- Error scenario testing for different error types
- Progress update testing for loading states
- Retry functionality testing

Run tests with:
```bash
npm test -- UserFeedback --run
npm test -- useUserFeedback --run
npm test -- userFriendlyErrors --run
npm test -- userFeedbackIntegration --run
```

## Accessibility

The user feedback system is designed with accessibility in mind:

- Proper ARIA roles and labels
- Screen reader friendly error messages
- Keyboard navigation support
- High contrast color schemes
- Focus management for interactive elements