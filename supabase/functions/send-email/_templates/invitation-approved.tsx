import { Html, Head, Body, Container, Section, Text, Heading, Button, Hr } from "https://esm.sh/@react-email/components@0.0.7"

interface InvitationApprovedProps {
  parentName?: string
  childName?: string
  activationUrl?: string
  expirationDate?: string
}

export function InvitationApprovedEmail({
  parentName = 'there',
  childName = 'your child',
  activationUrl = '#',
  expirationDate = '7 days from now'
}: InvitationApprovedProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>🎉 Invitation Approved!</Heading>
          </Section>
          
          <Section style={content}>
            <Text style={paragraph}>Hi {parentName},</Text>
            
            <Text style={paragraph}>
              Great news! Your invitation request for <strong>{childName}</strong> has been approved!
            </Text>
            
            <Text style={paragraph}>
              Click the button below to activate the author account and start creating amazing content:
            </Text>
            
            <Section style={buttonContainer}>
              <Button style={button} href={activationUrl}>
                Activate Author Account
              </Button>
            </Section>
            
            <Section style={warning}>
              <Text style={warningText}>
                <strong>⏰ Important:</strong> This invitation link expires on <strong>{expirationDate}</strong>. Please activate the account before then.
              </Text>
            </Section>
            
            <Text style={paragraph}>
              <strong>What you can do once activated:</strong>
            </Text>
            
            <ul style={list}>
              <li>Create and publish articles across different categories</li>
              <li>Engage with the community through comments</li>
              <li>Earn tokens for participation and engagement</li>
              <li>Access the author dashboard and tools</li>
            </ul>
            
            <Text style={paragraph}>
              We're thrilled to welcome {childName} to our community of young writers!
            </Text>
            
            <Text style={paragraph}>
              Best regards,<br />
              The Kids News Platform Team
            </Text>
          </Section>
          
          <Hr style={hr} />
          
          <Section style={footer}>
            <Text style={footerText}>
              If you're having trouble with the button above, copy and paste this link into your browser:
            </Text>
            <Text style={linkText}>{activationUrl}</Text>
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

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#28a745',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '15px 30px',
}

const warning = {
  backgroundColor: '#fff3cd',
  border: '1px solid #ffeaa7',
  padding: '15px',
  borderRadius: '6px',
  margin: '20px 0',
}

const warningText = {
  fontSize: '14px',
  color: '#856404',
  margin: '0',
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
  margin: '0 0 8px 0',
}

const linkText = {
  color: '#666666',
  fontSize: '12px',
  wordBreak: 'break-all' as const,
  margin: '0',
}