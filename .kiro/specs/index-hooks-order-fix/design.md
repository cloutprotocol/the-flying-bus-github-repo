# Design Document

## Overview

Fix the hooks order violation in the Index component by moving all hook calls to the top of the component, before any conditional returns. This is a simple structural fix that maintains all existing functionality while ensuring React's Rules of Hooks are followed.

## Architecture

### Current Problem
The Index component currently has this problematic structure:
```typescript
const Index = () => {
  // Some hooks at the top
  const [state, setState] = useState(...)
  const abortControllerRef = useRef(...)
  const categoryMapping = useMemo(...)
  const getUserFriendlyErrorMessage = useCallback(...)
  const fetchArticles = useCallback(...)
  const handleRetry = useCallback(...)
  
  useEffect(...) // Hook called here
  
  // CONDITIONAL RETURN - VIOLATES RULES OF HOOKS
  if (state.isLoading) {
    return <LoadingUI />
  }
  
  // CONDITIONAL RETURN - VIOLATES RULES OF HOOKS  
  if (state.error) {
    return <ErrorUI />
  }
  
  // MORE HOOKS CALLED AFTER CONDITIONAL RETURNS - VIOLATION!
  const hasHeadlineArticle = useMemo(...)
  const categoriesWithContent = useMemo(...)
  const hasAnyContent = useMemo(...)
  
  // More conditional returns...
}
```

### Solution
Move all hooks to the top before any conditional logic:
```typescript
const Index = () => {
  // ALL HOOKS AT THE TOP
  const [state, setState] = useState(...)
  const abortControllerRef = useRef(...)
  const categoryMapping = useMemo(...)
  const getUserFriendlyErrorMessage = useCallback(...)
  const fetchArticles = useCallback(...)
  const handleRetry = useCallback(...)
  const hasHeadlineArticle = useMemo(...)
  const categoriesWithContent = useMemo(...)
  const hasAnyContent = useMemo(...)
  const PartialFailureNotification = useMemo(...)
  
  useEffect(...) // All useEffect calls
  
  // NOW SAFE TO HAVE CONDITIONAL RETURNS
  if (state.isLoading) {
    return <LoadingUI />
  }
  
  if (state.error) {
    return <ErrorUI />
  }
  
  // Rest of component logic...
}
```

## Components and Interfaces

### No Interface Changes
- All existing props, state, and function signatures remain identical
- No changes to component API or external interfaces
- All existing functionality preserved

### Internal Structure Changes
1. **Hook Consolidation**: Move all hook calls to the top of the component
2. **Conditional Logic Separation**: Keep all conditional returns after hook calls
3. **Memoization Preservation**: Maintain all existing useMemo and useCallback optimizations

## Data Models

No changes to data models. All existing state structure and data flow remains identical.

## Error Handling

No changes to error handling logic. All existing error states and user feedback mechanisms remain unchanged.

## Testing Strategy

### Validation Tests
1. **Hooks Order Test**: Verify no "Rendered more hooks than during the previous render" errors
2. **Functionality Test**: Confirm all existing features work correctly
3. **UI State Test**: Verify all UI states (loading, error, content, no content) render properly
4. **Integration Test**: Run existing integration tests to ensure no regressions

### Test Approach
- Run existing integration tests to verify no functionality changes
- Add specific test for hooks order compliance
- Verify component renders correctly in all states