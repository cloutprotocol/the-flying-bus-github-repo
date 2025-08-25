# Requirements Document

## Introduction

Fix the critical hooks order violation in the Index component that was introduced during the home page simplification. The component currently violates the Rules of Hooks by calling `useMemo` hooks after conditional return statements, causing "Rendered more hooks than during the previous render" errors.

## Requirements

### Requirement 1

**User Story:** As a developer, I want the Index component to follow React's Rules of Hooks, so that the component renders consistently without errors.

#### Acceptance Criteria

1. WHEN the Index component renders THEN all hooks SHALL be called in the same order every time
2. WHEN the Index component re-renders THEN no "Rendered more hooks than during the previous render" errors SHALL occur
3. WHEN hooks are called THEN they SHALL be called before any conditional return statements

### Requirement 2

**User Story:** As a user, I want the home page to load correctly, so that I can view articles without encountering rendering errors.

#### Acceptance Criteria

1. WHEN I visit the home page THEN the page SHALL render without JavaScript errors
2. WHEN the page loads THEN all content SHALL display correctly
3. WHEN the page encounters different states (loading, error, no content) THEN the appropriate UI SHALL be shown

### Requirement 3

**User Story:** As a developer, I want the existing functionality to remain unchanged, so that the fix doesn't introduce new bugs.

#### Acceptance Criteria

1. WHEN the hooks order is fixed THEN all existing functionality SHALL work as before
2. WHEN the component renders THEN the same UI states SHALL be available (loading, error, content, no content)
3. WHEN user interactions occur THEN retry and refresh functionality SHALL work correctly