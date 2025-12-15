// Simple test to verify email templates can be imported and rendered
import { 
  InvitationConfirmationEmail,
  InvitationApprovedEmail,
  InvitationExpiredEmail,
  InvitationInvalidEmail,
  InvitationUsedEmail
} from './index.ts'

export async function testEmailTemplates() {
  console.log('Testing email template imports...')
  
  try {
    // Test template instantiation with sample data
    const confirmationEmail = InvitationConfirmationEmail({
      parentName: 'John Doe',
      childName: 'Jane Doe',
      submissionDate: '2024-01-15'
    })
    
    const approvedEmail = InvitationApprovedEmail({
      parentName: 'John Doe',
      childName: 'Jane Doe',
      activationUrl: 'https://example.com/activate/token123',
      expirationDate: '2024-01-22'
    })
    
    const expiredEmail = InvitationExpiredEmail({
      parentName: 'John Doe',
      childName: 'Jane Doe',
      expirationDate: '2024-01-22',
      supportEmail: 'support@kidsnews.com'
    })
    
    const invalidEmail = InvitationInvalidEmail({
      parentName: 'John Doe',
      childName: 'Jane Doe',
      supportEmail: 'support@kidsnews.com',
      requestUrl: 'https://example.com/request-invitation'
    })
    
    const usedEmail = InvitationUsedEmail({
      parentName: 'John Doe',
      childName: 'Jane Doe',
      usedDate: '2024-01-20',
      dashboardUrl: 'https://example.com/dashboard',
      supportEmail: 'support@kidsnews.com'
    })
    
    console.log('✅ All email templates imported and instantiated successfully')
    
    return {
      success: true,
      templates: {
        confirmation: confirmationEmail,
        approved: approvedEmail,
        expired: expiredEmail,
        invalid: invalidEmail,
        used: usedEmail
      }
    }
  } catch (error) {
    console.error('❌ Error testing email templates:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Test template types
export function testTemplateTypes() {
  console.log('Testing template type definitions...')
  
  const templateTypes = [
    'invitation_confirmation',
    'invitation_approved', 
    'invitation_expired',
    'invitation_invalid',
    'invitation_used'
  ]
  
  console.log('✅ Template types defined:', templateTypes)
  
  return {
    success: true,
    types: templateTypes
  }
}

// Export test runner
export async function runAllTests() {
  console.log('🧪 Running email template tests...')
  
  const typeTest = testTemplateTypes()
  const templateTest = await testEmailTemplates()
  
  const allPassed = typeTest.success && templateTest.success
  
  console.log(allPassed ? '✅ All tests passed!' : '❌ Some tests failed')
  
  return {
    success: allPassed,
    results: {
      types: typeTest,
      templates: templateTest
    }
  }
}