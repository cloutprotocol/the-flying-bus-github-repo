# Implementation Plan

- [x] 1. Fix RLS policies for email_events table
  - Update RLS policies to allow admin operations and system logging
  - Add service role bypass for invitation-related email events
  - Test policy changes don't break existing functionality
  - _Requirements: 1.1, 2.1, 2.2_

- [x] 2. Add authentication context awareness to RequestInvitation component
  - Import and use useAuth hook to detect authentication state
  - Implement conditional form submission logic for authenticated vs anonymous users
  - Add proper error handling for authentication context issues
  - Test form submission works for both authenticated and anonymous users
  - _Requirements: 1.2, 3.1_

- [x] 3. Implement service role elevation for admin operations
  - Create admin service wrapper that uses service role for database operations
  - Update updateInvitationRequestStatus to use elevated permissions
  - Add proper error handling and fallback mechanisms
  - Test admin approval/denial operations work correctly
  - _Requirements: 2.1, 2.2, 3.2_

- [x] 4. Fix email event logging RLS policies
  - Update email_events table policies to allow invitation-related logging
  - Add service role permissions for system operations
  - Ensure audit logging works for all invitation operations
  - Test email sending and logging works end-to-end
  - _Requirements: 2.2, 3.3_

- [x] 5. Add comprehensive error handling and user feedback
  - Implement specific error messages for RLS policy violations
  - Add retry mechanisms for failed admin operations
  - Improve user feedback for form submission states
  - Test error scenarios and recovery mechanisms
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 6. Create integration tests for invitation workflow
  - Write tests for anonymous user form submission
  - Write tests for authenticated user form submission
  - Write tests for admin approval/denial operations
  - Write tests for email notification flow
  - Test all authentication contexts and permission boundaries
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3_