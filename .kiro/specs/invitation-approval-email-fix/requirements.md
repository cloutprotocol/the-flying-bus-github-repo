# Requirements Document

## Introduction

The invitation approval process is failing to send emails when admins approve invitation requests in the dashboard. While the form submission process works correctly by calling the `send-email` Edge Function directly, the approval process is attempting to generate tokens via the `invitation-tokens` Edge Function first, which is causing CORS errors and function failures. This spec addresses the need to align the approval email process with the working form submission process.

## Requirements

### Requirement 1

**User Story:** As an admin approving an invitation request, I want the parent to receive an invitation email immediately after approval, so that they can proceed with account creation without delays.

#### Acceptance Criteria

1. WHEN an admin approves an invitation request THEN the system SHALL send an invitation email within 30 seconds using the same server-side method as form submission
2. WHEN the invitation email is sent THEN it SHALL appear in the Resend dashboard logs immediately
3. WHEN the email sending process fails THEN the system SHALL provide clear error messages to the admin
4. WHEN the email is sent successfully THEN the system SHALL update the invitation_email_sent_at timestamp

### Requirement 2

**User Story:** As a system administrator, I want the invitation approval email process to use the same reliable server-side method as the form submission, so that both processes have consistent behavior and success rates.

#### Acceptance Criteria

1. WHEN the approval process sends emails THEN it SHALL use the `send-email` Edge Function directly like the form submission process
2. WHEN the approval process runs THEN it SHALL NOT attempt to call the `invitation-tokens` Edge Function for email sending
3. WHEN both form submission and approval processes run THEN they SHALL use identical email sending mechanisms
4. WHEN emails are sent via either process THEN they SHALL both appear in Resend logs with the same reliability

### Requirement 3

**User Story:** As a developer, I want the invitation approval process to avoid CORS issues and function failures, so that the email sending is reliable and doesn't require client-side workarounds.

#### Acceptance Criteria

1. WHEN the approval process sends emails THEN it SHALL NOT make direct fetch calls that can cause CORS errors
2. WHEN the approval process runs THEN it SHALL use only Supabase SDK methods for Edge Function calls
3. WHEN Edge Functions are called THEN they SHALL handle all authentication and CORS headers properly
4. WHEN the approval process fails THEN it SHALL provide detailed error information for debugging

### Requirement 4

**User Story:** As a parent whose invitation was approved, I want to receive the invitation email with a valid token link, so that I can complete the account creation process for my child.

#### Acceptance Criteria

1. WHEN my invitation is approved THEN I SHALL receive an email with a valid invitation token link
2. WHEN I click the invitation link THEN it SHALL direct me to the account creation page with proper token validation
3. WHEN the token is generated THEN it SHALL be valid for the standard expiration period (168 hours)
4. WHEN I use the token THEN it SHALL allow me to complete the account creation process successfully

### Requirement 5

**User Story:** As a system administrator, I want the audit logging to work correctly during the approval process, so that all actions are properly tracked and the database schema issues are resolved.

#### Acceptance Criteria

1. WHEN the approval process runs THEN audit logs SHALL be created without database schema errors
2. WHEN audit logging fails due to missing columns THEN the system SHALL handle the error gracefully without breaking the main process
3. WHEN the approval process completes THEN all relevant actions SHALL be logged for compliance and debugging
4. WHEN database schema issues occur THEN they SHALL be identified and resolved to prevent future logging failures