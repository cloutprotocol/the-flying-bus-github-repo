import { Html, Head, Body, Container, Section, Text, Heading, Button, Hr } from "https://esm.sh/@react-email/components@0.0.7"

interface InvitationInvalidProps {
  parentName?: string
  childName?: string
  supportEmail?: string
  requestUrl?: string
}

export function InvitationInvalidEmail({
  parentName = 'there',
  childName = 'your child',
  supportEmail = 'support@kidsnews.com',
  requestUrl = 'https://kidsnews.com/request-invitation'
}: InvitationInvalidProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>❌ Invalid Invitation Link</Heading>
          </Section>
          
          <Section style={content}>
            <Text style={paragraph}>Hi {parentName},</Text>
            
            <Text style={paragraph}>
              We noticed that you tried to use an invitation link, but unfortunately it appears to be invalid or corrupted.
            </Text>
            
            <Section style={errorBox}>
              <Text style={errorText}>
                <strong>Invalid Link:</strong> The invitation link you clicked is not valid or may have been corrupted.
              </Text>
            </Section>
            
            <Text style={paragraph}>
              <strong>This could happen if:</strong>
            </Text>
            
            <ul style={list}>
              <li>The link was copied incorrectly or is incomplete</li>
              <li>The email was forwarded and the link got broken</li>
              <li>The invitation was already used or cancelled</li>
              <li>There was a technical issue with the link generation</li>
            </ul>
            
            <Text style={paragraph}>
              <strong>What you can do:</strong>
            </Text>
            
            <ul style={list}>
              <li>Check your email for the original invitation message</li>
              <li>Try copying the full link from the email again</li>
              <li>Contact our support team for assistance</li>
              <li>Submit a new invitation request if needed</li>
            </ul>
            
            <Section style={buttonContainer}>
              <Button style={supportButton} href={`mailto:${supportEmail}?subject=Invalid Invitation Link&body=Hi, I'm having trouble with an invitation link for ${childName}. The link appears to be invalid.`}>
                Contact Support
              </Button>
              <Button style={requestButton} href={requestUrl}>
                Request New Invitation
              </Button>
            </Section>
            
            <Text style={paragraph}>
              We're here to help get {childName} set up as an author on our platform. Don't hesitate to reach out!
            </Text>
            
            <Text style={paragraph}>
              Best regards,<br />
              The Kids News Platform Team
            </Text>
          </Section>
          
          <Hr style={hr} />
          
          <Section style={footer}>
            <Text style={footerText}>
              Need help? Contact us at {supportEmail}
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
  background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
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

const errorBox = {
  backgroundColor: '#f8d7da',
  border: '1px solid #f5c6cb',
  padding: '15px',
  borderRadius: '6px',
  margin: '20px 0',
}

const errorText = {
  fontSize: '14px',
  color: '#721c24',
  margin: '0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
  display: 'flex',
  gap: '15px',
  justifyContent: 'center',
  flexWrap: 'wrap' as const,
}

const supportButton = {
  backgroundColor: '#007bff',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '15px 25px',
  margin: '5px',
}

const requestButton = {
  backgroundColor: '#28a745',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '15px 25px',
  margin: '5px',
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