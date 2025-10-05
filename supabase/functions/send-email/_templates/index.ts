// Email template exports for the invitation flow
export { InvitationConfirmationEmail } from './invitation-confirmation.tsx'
export { InvitationApprovedEmail } from './invitation-approved.tsx'
export { InvitationExpiredEmail } from './invitation-expired.tsx'
export { InvitationInvalidEmail } from './invitation-invalid.tsx'
export { InvitationUsedEmail } from './invitation-used.tsx'

// Template type definitions
export interface InvitationConfirmationProps {
  parentName?: string
  childName?: string
  submissionDate?: string
}

export interface InvitationApprovedProps {
  parentName?: string
  childName?: string
  activationUrl?: string
  expirationDate?: string
}

export interface InvitationExpiredProps {
  parentName?: string
  childName?: string
  expirationDate?: string
  supportEmail?: string
}

export interface InvitationInvalidProps {
  parentName?: string
  childName?: string
  supportEmail?: string
  requestUrl?: string
}

export interface InvitationUsedProps {
  parentName?: string
  childName?: string
  usedDate?: string
  dashboardUrl?: string
  supportEmail?: string
}

// Template type mapping for email service
export type EmailTemplateType = 
  | 'invitation_confirmation'
  | 'invitation_approved'
  | 'invitation_expired'
  | 'invitation_invalid'
  | 'invitation_used'

export type EmailTemplateProps = 
  | InvitationConfirmationProps
  | InvitationApprovedProps
  | InvitationExpiredProps
  | InvitationInvalidProps
  | InvitationUsedProps