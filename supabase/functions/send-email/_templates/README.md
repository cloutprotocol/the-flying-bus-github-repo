# Email Templates

This directory contains React Email templates for the invitation flow system.

## Available Templates

### 1. Invitation Confirmation (`invitation-confirmation.tsx`)
Sent when a user submits an invitation request.

**Props:**
- `parentName` (optional): Name of the parent/guardian
- `childName` (optional): Name of the child
- `submissionDate` (optional): Date when the request was submitted

**Usage:**
```typescript
const email = InvitationConfirmationEmail({
  parentName: 'John Doe',
  childName: 'Jane Doe',
  submissionDate: '2024-01-15'
})
```

### 2. Invitation Approved (`invitation-approved.tsx`)
Sent when an admin approves an invitation request with an activation link.

**Props:**
- `parentName` (optional): Name of the parent/guardian
- `childName` (optional): Name of the child
- `activationUrl` (optional): URL for account activation
- `expirationDate` (optional): When the invitation expires

**Usage:**
```typescript
const email = InvitationApprovedEmail({
  parentName: 'John Doe',
  childName: 'Jane Doe',
  activationUrl: 'https://example.com/activate/token123',
  expirationDate: '2024-01-22'
})
```

### 3. Invitation Expired (`invitation-expired.tsx`)
Sent when a user tries to use an expired invitation link.

**Props:**
- `parentName` (optional): Name of the parent/guardian
- `childName` (optional): Name of the child
- `expirationDate` (optional): When the invitation expired
- `supportEmail` (optional): Support contact email

**Usage:**
```typescript
const email = InvitationExpiredEmail({
  parentName: 'John Doe',
  childName: 'Jane Doe',
  expirationDate: '2024-01-22',
  supportEmail: 'support@kidsnews.com'
})
```

### 4. Invitation Invalid (`invitation-invalid.tsx`)
Sent when a user tries to use an invalid or corrupted invitation link.

**Props:**
- `parentName` (optional): Name of the parent/guardian
- `childName` (optional): Name of the child
- `supportEmail` (optional): Support contact email
- `requestUrl` (optional): URL to request a new invitation

**Usage:**
```typescript
const email = InvitationInvalidEmail({
  parentName: 'John Doe',
  childName: 'Jane Doe',
  supportEmail: 'support@kidsnews.com',
  requestUrl: 'https://example.com/request-invitation'
})
```

### 5. Invitation Used (`invitation-used.tsx`)
Sent when a user tries to use an invitation link that has already been activated.

**Props:**
- `parentName` (optional): Name of the parent/guardian
- `childName` (optional): Name of the child
- `usedDate` (optional): When the invitation was used
- `dashboardUrl` (optional): URL to the author dashboard
- `supportEmail` (optional): Support contact email

**Usage:**
```typescript
const email = InvitationUsedEmail({
  parentName: 'John Doe',
  childName: 'Jane Doe',
  usedDate: '2024-01-20',
  dashboardUrl: 'https://example.com/dashboard',
  supportEmail: 'support@kidsnews.com'
})
```

## Template Features

### Responsive Design
All templates are designed to be responsive and work well on:
- Desktop email clients
- Mobile email apps
- Web-based email clients

### Consistent Branding
All templates include:
- Kids News Platform branding
- Consistent color scheme and typography
- Professional gradient headers
- Clear call-to-action buttons

### Accessibility
Templates follow email accessibility best practices:
- Semantic HTML structure
- Sufficient color contrast
- Alt text for images (when applicable)
- Clear, readable fonts

### Fallback Support
Each template includes:
- HTML version for rich email clients
- Plain text version for basic email clients
- Fallback styles for older email clients

## Development

### Testing Templates
Use the test file to verify templates work correctly:

```typescript
import { runAllTests } from './template-test.ts'

const results = await runAllTests()
console.log(results)
```

### Adding New Templates
1. Create a new `.tsx` file in this directory
2. Follow the existing template structure
3. Export the component and props interface
4. Add the template to `index.ts`
5. Update the email service to support the new template type
6. Add tests for the new template

### Template Structure
Each template should follow this structure:

```typescript
import { Html, Head, Body, Container, Section, Text, Heading, Button, Hr } from "https://esm.sh/@react-email/components@0.0.7"

interface TemplateProps {
  // Define props here
}

export function TemplateEmail(props: TemplateProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Template content */}
        </Container>
      </Body>
    </Html>
  )
}

// Styles object
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

// Additional styles...
```

## Dependencies

Templates use React Email components from:
- `@react-email/components@0.0.7`

The components are imported via ESM from:
- `https://esm.sh/@react-email/components@0.0.7`