import { Html, Head, Body, Container, Section, Text, Heading, Button, Hr } from "https://esm.sh/@react-email/components@0.0.7"

interface InvitationExpiredProps {
  parentName?: string
  childName?: string
  expirationDate?: string
  supportEmail?: string
}

export function InvitationExpiredEmail({
  parentName = 'there',
  childName = 'your child',
  expirationDate = 'recently',
  supportEmail = 'support@kidsnews.com'
}: InvitationExpiredProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>⏰ Invitation Link Expired</Heading>
          </Section>
          
          <Section style={content}>
            <Text style={paragraph}>Hi {parentName},</Text>
            
            <Text style={paragraph}>
              We noticed that you tried to use an invitation link for <strong>{childName}</strong>, but unfortunately it has expired.
            </Text>
            
            <Section style={errorBox}>
              <Text style={errorText}>
                <strong>Expired:</strong> This invitation link expired on <strong>{expirationDate}</strong>
              </Text>
            </Section>
            
            <Text style={paragraph}>
              <strong>What you can do:</strong>
            </Text>
            
            <ul style={list}>
              <li>Contact our support team to request a new invitation link</li>
              <li>Submit a new invitation request through our website</li>
              <li>Check if you have any other invitation emails in your inbox</li>
            </ul>
            
            <Section style={buttonContainer}>
              <Button style={button} href={`mailto:${supportEmail}?subject=Request New Invitation Link&body=Hi, I need a new invitation link for ${childName}. My previous link expired on ${expirationDate}.`}>
                Contact Support
              </Button>
            </Section>
            
            <Text style={paragraph}>
              We apologize for any inconvenience. Our team is here to help get {childName} set up as an author on our platform.
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
}

const button = {
  backgroundColor: '#007bff',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '15px 30px',
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