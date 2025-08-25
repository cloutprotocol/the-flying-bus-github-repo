# Implementation Plan

- [x] 1. Enhance send-email Edge Function to handle invitation approval emails with token generation
  - Add support for 'invitation_approved' email type in send-email function
  - Integrate token generation logic from invitation-tokens function into send-email function
  - Create invitation approval email template with token URL
  - Test token generation within Edge Function environment
  - _Requirements: 2.1, 2.2, 4.1, 4.3_

- [x] 2. Fix sendInvitationEmailFallback function to use direct email sending
  - Remove calls to AuthenticatedApiService.generateInvitationToken from sendInvitationEmailFallback
  - Update sendInvitationEmailFallback to call AuthenticatedApiService.sendEmail directly with 'invitation_approved' type
  - Update error handling to match sendConfirmationEmailFallback pattern
  - Remove token generation logic from client-side invitation service
  - _Requirements: 1.1, 2.1, 2.3, 3.1, 3.2_

- [x] 3. Fix audit logging schema issues to prevent database errors
  - Add user_agent column to audit_logs table or make it optional in audit logging functions
  - Update auditLogService to handle missing user_agent column gracefully
  - Ensure audit logging failures don't break the main email process
  - Test audit logging with the updated schema
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 4. Update database triggers to use enhanced send-email function
  - Modify send_invitation_email trigger function to call send-email with 'invitation_approved' type
  - Update send_invitation_email_rpc function to use unified email sending approach
  - Ensure triggers pass correct template data including invitationId for token generation
  - Test database trigger execution with enhanced email function
  - _Requirements: 1.1, 2.1, 2.2_

- [x] 5. Test and validate the complete invitation approval email flow
  - Test invitation approval from admin dashboard to ensure emails are sent
  - Verify emails appear in Resend dashboard logs immediately after approval
  - Test that invitation tokens are generated correctly and work for account creation
  - Validate that both database triggers and client fallbacks work reliably
  - _Requirements: 1.1, 1.2, 1.4, 4.1, 4.2, 4.4_

- [x] 6. Remove unused invitation-tokens function calls from client-side code
  - Remove generateInvitationToken calls from invitation service client-side fallback
  - Clean up unused imports and dependencies related to client-side token generation
  - Update error handling to remove token generation error paths
  - Ensure no remaining CORS-prone direct API calls exist in approval flow
  - _Requirements: 3.1, 3.2, 3.3_