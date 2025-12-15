import { Html, Head, Body, Container, Section, Text, Heading, Button, Hr } from "https://esm.sh/@react-email/components@0.0.7"

interface InvitationConfirmationProps {
  parentName?: string
  childName?: string
  submissionDate?: string
}

export function InvitationConfirmationEmail({
  parentName = 'there',
  childName = 'your child',
  submissionDate = 'today'
}: InvitationConfirmationProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>🎉 Invitation Request Received!</Heading>
          </Section>
          
          <Section style={content}>
            <Text style={paragraph}>Hi {parentName},</Text>
            
            <Text style={paragraph}>
              Thank you for requesting an invitation for <strong>{childName}</strong> to join our Kids News Platform!
            </Text>
            
            <Text style={paragraph}>
              We've received your request submitted on <strong>{submissionDate}</strong> and our team will review it shortly.
            </Text>
            
            <Text style={paragraph}>
              <strong>What happens next?</strong>
            </Text>
            
            <ul style={list}>
              <li>Our team will review your invitation request</li>
              <li>You'll receive an email with an invitation link once approved</li>
              <li>The invitation link will be valid for 7 days</li>
              <li>Use the link to activate the author account</li>
            </ul>
            
            <Text style={paragraph}>
              We're excited to have {childName} potentially join our community of young writers and readers!
            </Text>
            
            <Text style={paragraph}>
              Best regards,<br />
              The Kids News Platform Team
            </Text>
          </Section>
          
          <Hr style={hr} />
          
          <Section style={footer}>
            <Text style={footerText}>
              This is an automated message. Please do not reply to this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
  width: '100%',
}

const header = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#ffffff',
  padding: '30px',
  textAlign: 'center' as const,
  borderRadius: '8px 8px 0 0',
}

const headerTitle = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
  color: '#ffffff',
}

const content = {
  backgroundColor: '#f9f9f9',
  padding: '30px',
  borderRadius: '0 0 8px 8px',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#333333',
  margin: '16px 0',
}

const list = {
  fontSize: '16px',
  lineHeight: '1.6',
  color: '#333333',
  margin: '16px 0',
  paddingLeft: '20px',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
}

const footer = {
  textAlign: 'center' as const,
  marginTop: '30px',
}

const footerText = {
  color: '#666666',
  fontSize: '14px',
  margin: '0',
}