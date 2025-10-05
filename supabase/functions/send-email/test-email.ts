// Test script for the email service
// This can be used to test the email functionality locally

interface TestEmailRequest {
  type: 'invitation_confirmation' | 'invitation_approved'
  to: string
  templateData: Record<string, any>
}

export async function testEmailService() {
  console.log('Testing Email Service...')

  // Test invitation confirmation email
  const confirmationTest: TestEmailRequest = {
    type: 'invitation_confirmation',
    to: 'test@example.com',
    templateData: {
      parentName: 'John Doe',
      childName: 'Jane Doe',
      submissionDate: new Date().toLocaleDateString()
    }
  }

  // Test invitation approved email
  const approvedTest: TestEmailRequest = {
    type: 'invitation_approved',
    to: 'test@example.com',
    templateData: {
      parentName: 'John Doe',
      childName: 'Jane Doe',
      activationUrl: 'https://example.com/activate?token=test123',
      expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
    }
  }

  const tests = [confirmationTest, approvedTest]

  for (const test of tests) {
    try {
      console.log(`Testing ${test.type} email...`)
      
      // Import and test email service
      const { EmailService } = await import('./email-service.ts')
      const apiKey = Deno.env.get('RESEND_API_KEY') || 'test-key'
      const emailService = new EmailService(apiKey)

      const result = await emailService.sendEmail(test)
      
      console.log(`Result for ${test.type}:`, {
        success: result.success,
        messageId: result.messageId,
        error: result.error
      })

    } catch (error) {
      console.error(`Error testing ${test.type}:`, error)
    }
  }

  // Test health check
  try {
    const { EmailMonitor } = await import('./email-logger.ts')
    const health = await EmailMonitor.healthCheck()
    console.log('Health check result:', health)
  } catch (error) {
    console.error('Error testing health check:', error)
  }
}

// Run tests if this file is executed directly
if (import.meta.main) {
  await testEmailService()
}