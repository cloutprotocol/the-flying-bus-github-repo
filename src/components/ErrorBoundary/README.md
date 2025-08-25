# Admin Dashboard Error Boundaries

This directory contains error boundary components specifically designed for the admin dashboard to prevent infinite loops and provide graceful error handling.

## Components

### AdminErrorBoundary
The main error boundary component with retry mechanisms and cooldown periods to prevent infinite loops.

**Features:**
- Catches and displays errors gracefully
- Retry mechanism with exponential backoff
- Maximum retry limits (3 attempts by default)
- Cooldown period between retries (5 seconds)
- Error logging for debugging
- Custom fallback component support

**Usage:**
```tsx
import { AdminErrorBoundary } from '@/components/ErrorBoundary';

<AdminErrorBoundary section="dashboard">
  <YourComponent />
</AdminErrorBoundary>
```

### Dashboard Section Error Boundaries
Pre-configured error boundaries for specific dashboard sections:

- `MetricsErrorBoundary` - For dashboard metrics section
- `ActivitiesErrorBoundary` - For activity feed section  
- `ArticlesErrorBoundary` - For recent articles section

**Usage:**
```tsx
import { 
  MetricsErrorBoundary,
  ActivitiesErrorBoundary,
  ArticlesErrorBoundary 
} from '@/components/ErrorBoundary';

<MetricsErrorBoundary>
  <DashboardMetrics />
</MetricsErrorBoundary>

<ActivitiesErrorBoundary>
  <ActivityFeed />
</ActivitiesErrorBoundary>

<ArticlesErrorBoundary>
  <RecentArticles />
</ArticlesErrorBoundary>
```

### AdminDashboardErrorProvider
Context provider for managing error state across the entire admin dashboard.

**Usage:**
```tsx
import { AdminDashboardErrorProvider } from '@/components/ErrorBoundary';

<AdminDashboardErrorProvider>
  <AdminDashboard />
</AdminDashboardErrorProvider>
```

### withErrorBoundary HOC
Higher-order component for wrapping components with error boundaries.

**Usage:**
```tsx
import { withErrorBoundary } from '@/components/ErrorBoundary';

const SafeComponent = withErrorBoundary(YourComponent, {
  section: 'component-name'
});
```

## Error Recovery Hook

### useErrorRecovery
Hook for managing error recovery with retry logic and cooldown periods.

**Features:**
- Configurable max retries
- Exponential backoff
- Cooldown periods
- Concurrent retry prevention

**Usage:**
```tsx
import { useErrorRecovery } from '@/components/ErrorBoundary';

const { retry, canRetry, retryCount, isRecovering } = useErrorRecovery({
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true
});

const handleRetry = async () => {
  await retry(async () => {
    // Your retry logic here
    await fetchData();
  });
};
```

## Key Features

### Infinite Loop Prevention
- **Retry Limits**: Maximum of 3 retry attempts by default
- **Cooldown Periods**: 5-second cooldown between retries
- **Exponential Backoff**: Increasing delays between retry attempts
- **Concurrent Prevention**: Blocks multiple simultaneous retry attempts

### Graceful Degradation
- **Section Isolation**: Errors in one section don't affect others
- **Fallback UI**: User-friendly error messages with retry options
- **Partial Functionality**: Dashboard continues to work even if some sections fail

### Developer Experience
- **Error Logging**: Detailed error information for debugging
- **Context Information**: Section-specific error reporting
- **Testing Support**: Comprehensive test coverage for all scenarios

## Implementation Notes

### Requirements Addressed
- **1.3**: Error boundaries catch and handle errors gracefully
- **2.5**: Single error messages without looping
- **3.3**: Retry mechanisms that don't trigger infinite loops
- **5.3**: Proper error handling that prevents cascading failures

### Design Decisions
- **Component-Level Boundaries**: Each major dashboard section has its own error boundary
- **Retry Cooldowns**: Prevent rapid successive retry attempts
- **Error Context**: Section-specific error messages and handling
- **Graceful Fallbacks**: User-friendly error displays with recovery options

## Testing

All error boundary components include comprehensive tests covering:
- Error catching and display
- Retry functionality
- Cooldown periods
- Error isolation
- Integration scenarios

Run tests with:
```bash
npm test -- src/components/ErrorBoundary/__tests__ --run
```