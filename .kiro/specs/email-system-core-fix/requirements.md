# Requirements Document

## Introduction

The email notification system is currently failing to send emails through the application interface, despite working in backend tests. The core issue is that the database triggers and RPC functions cannot properly call the Edge Functions due to misconfigured database settings and authentication issues. This spec addresses the fundamental configuration and authentication problems preventing emails from being sent.

## Requirements

### Requirement 1

**User Story:** As a parent submitting an invitation request, I want to receive a confirmation email immediately after submission, so that I know my request was received.

#### Acceptance Criteria

1. WHEN a parent submits an invitation request THEN the system SHALL send a confirmation email within 30 seconds
2. WHEN the database trigger fails THEN the system SHALL automatically use the client-side fallback method
3. WHEN both methods fail THEN the system SHALL log detailed error information for debugging
4. WHEN the email is sent successfully THEN the system SHALL update the confirmation_email_sent_at timestamp

### Requirement 2

**User Story:** As an admin approving an invitation request, I want the parent to receive an invitation email automatically, so that they can proceed with account creation.

#### Acceptance Criteria

1. WHEN an admin approves an invitation request THEN the system SHALL send an invitation email within 30 seconds
2. WHEN the database trigger fails THEN the system SHALL automatically use the client-side fallback method
3. WHEN both methods fail THEN the system SHALL log detailed error information for debugging
4. WHEN the invitation email is sent successfully THEN the system SHALL update the invitation_email_sent_at timestamp

### Requirement 3

**User Story:** As a system administrator, I want the database configuration to be properly set up with valid authentication credentials, so that database triggers can successfully call Edge Functions.

#### Acceptance Criteria

1. WHEN the system starts THEN the database configuration SHALL contain a valid service role key
2. WHEN database triggers execute THEN they SHALL successfully authenticate with Edge Functions
3. WHEN configuration is invalid THEN the system SHALL provide clear error messages
4. WHEN configuration is updated THEN the changes SHALL take effect immediately

### Requirement 4

**User Story:** As a developer, I want comprehensive error handling and logging throughout the email system, so that I can quickly identify and fix issues.

#### Acceptance Criteria

1. WHEN any email operation fails THEN the system SHALL log detailed error information including the failure reason
2. WHEN database triggers fail THEN the system SHALL log the specific authentication or configuration issue
3. WHEN client-side fallbacks are used THEN the system SHALL log why the primary method failed
4. WHEN all email methods fail THEN the system SHALL create an audit log entry for manual follow-up

### Requirement 5

**User Story:** As a system administrator, I want the email system to work reliably without requiring client-side API calls, so that emails are sent consistently regardless of client-side issues.

#### Acceptance Criteria

1. WHEN database triggers are properly configured THEN they SHALL successfully send emails without client intervention
2. WHEN the pg_net extension is available THEN database triggers SHALL use it for HTTP calls to Edge Functions
3. WHEN authentication is properly configured THEN Edge Function calls SHALL succeed from database triggers
4. WHEN the primary server-side method works THEN client-side fallbacks SHALL not be needed

### Requirement 6

**User Story:** As a developer, I want client-side email calls to use the proper Supabase SDK methods instead of direct fetch calls, so that CORS issues are avoided and authentication is handled correctly.

#### Acceptance Criteria

1. WHEN client-side code needs to call Edge Functions THEN it SHALL use supabase.functions.invoke() instead of direct fetch calls
2. WHEN using supabase.functions.invoke() THEN the system SHALL automatically handle authentication and CORS headers
3. WHEN direct fetch calls are replaced THEN emails SHALL reach Resend successfully from the frontend interface
4. WHEN Edge Functions are called via SDK THEN proper error handling and retry logic SHALL be maintained