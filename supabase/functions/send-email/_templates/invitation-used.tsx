import { Html, Head, Body, Container, Section, Text, Heading, Button, Hr } from "https://esm.sh/@react-email/components@0.0.7"

interface InvitationUsedProps {
  parentName?: string
  childName?: string
  usedDate?: string
  dashboardUrl?: string
  supportEmail?: string
}

export function InvitationUsedEmail({
  parentName = 'there',
  childName = 'your child',
  usedDate = 'recently',
  dashboardUrl = 'https://kidsnews.com/dashboard',
  supportEmail = 'support@kidsnews.com'
}: InvitationUsedProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>✅ Invitation Already Used</Heading>
          </Section>
          
          <Section style={content}>
            <Text style={paragraph}>Hi {parentName},</Text>
            
            <Text style={paragraph}>
              We noticed that you tried to use an invitation link for <strong>{childName}</strong>, but this invitation has already been activated.
            </Text>
            
            <Section style={successBox}>
              <Text style={successText}>
                <strong>Good News:</strong> This invitation was successfully used on <strong>{usedDate}</strong>
              </Text>
            </Section>
            
            <Text style={paragraph}>
              <strong>What this means:</strong>
            </Text>
            
            <ul style={list}>
              <li>{childName}'s author account is already active</li>
              <li>They can log in and start creating content</li>
              <li>All author features and tools are available</li>
              <li>They can earn tokens for engagement and participation</li>
            </ul>
            
            <Text style={paragraph}>
              <strong>Next steps:</strong>
            </Text>
            
            <ul style={list}>
              <li>Log in to access the author dashboard</li>
              <li>Start creating your first article</li>
              <li>Explore the different content categories</li>
              <li>Join the community discussions</li>
            </ul>
            
            <Section style={buttonContainer}>
              <Button style={dashboardButton} href={dashboardUrl}>
                Go to Dashboard
              </Button>
            </Section>
            
            <Text style={paragraph}>
              If you're having trouble accessing the account or if this wasn't you who activated it, please contact our support team immediately.
            </Text>
            
            <Section style={buttonContainer}>
              <Button style={supportButton} href={`mailto:${supportEmail}?subject=Account Access Issue&body=Hi, I'm having trouble accessing ${childName}'s author account. The invitation shows as already used on ${usedDate}.`}>
                Contact Support
              </Button>
            </Section>
            
            <Text style={paragraph}>
              Welcome to the Kids News Platform community!
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
  background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
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

const successBox = {
  backgroundColor: '#d4edda',
  border: '1px solid #c3e6cb',
  padding: '15px',
  borderRadius: '6px',
  margin: '20px 0',
}

const successText = {
  fontSize: '14px',
  color: '#155724',
  margin: '0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const dashboardButton = {
  backgroundColor: '#28a745',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '15px 30px',
  margin: '5px',
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