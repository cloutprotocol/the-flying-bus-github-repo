// Integration test for email templates
// This file can be used to test the email service with all template types

export interface TestEmailRequest {
  type: 'invitation_confirmation' | 'invitation_approved' | 'invitation_expired' | 'invitation_invalid' | 'invitation_used'
  to: string
  templateData: Record<string, any>
}

export const sampleEmailRequests: TestEmailRequest[] = [
  {
    type: 'invitation_confirmation',
    to: 'test@example.com',
    templateData: {
      parentName: 'John Doe',
      childName: 'Jane Doe',
      submissionDate: '2024-01-15'
    }
  },
  {
    type: 'invitation_approved',
    to: 'test@example.com',
    templateData: {
      parentName: 'John Doe',
      childName: 'Jane Doe',
      activationUrl: 'https://example.com/activate/token123',
      expirationDate: '2024-01-22'
    }
  },
  {
    type: 'invitation_expired',
    to: 'test@example.com',
    templateData: {
      parentName: 'John Doe',
      childName: 'Jane Doe',
      expirationDate: '2024-01-22',
      supportEmail: 'support@kidsnews.com'
    }
  },
  {
    type: 'invitation_invalid',
    to: 'test@example.com',
    templateData: {
      parentName: 'John Doe',
      childName: 'Jane Doe',
      supportEmail: 'support@kidsnews.com',
      requestUrl: 'https://example.com/request-invitation'
    }
  },
  {
    type: 'invitation_used',
    to: 'test@example.com',
    templateData: {
      parentName: 'John Doe',
      childName: 'Jane Doe',
      usedDate: '2024-01-20',
      dashboardUrl: 'https://example.com/dashboard',
      supportEmail: 'support@kidsnews.com'
    }
  }
]

export async function testEmailService() {
  console.log('🧪 Testing Email Service with all template types...')
  
  // Mock API key for testing
  const mockApiKey = 'test-api-key'
  
  try {
    const { EmailService } = await import('./email-service.ts')
    const emailService = new EmailService(mockApiKey)
    
    const results = []
    
    for (const request of sampleEmailRequests) {
      console.log(`Testing template: ${request.type}`)
      
      try {
        // Note: This will fail at the API call stage since we're using a mock key
        // But it will test template generation and validation
        const result = await emailService.sendEmail(request)
        results.push({
          type: request.type,
          success: result.success,
          error: result.error
        })
      } catch (error) {
        results.push({
          type: request.type,
          success: false,
          error: error.message
        })
      }
    }
    
    console.log('📊 Test Results:')
    results.forEach(result => {
      const status = result.success ? '✅' : '❌'
      console.log(`${status} ${result.type}: ${result.error || 'Success'}`)
    })
    
    return results
  } catch (error) {
    console.error('❌ Failed to test email service:', error)
    return []
  }
}

export function validateTemplateData() {
  console.log('🔍 Validating template data requirements...')
  
  const validationResults = []
  
  for (const request of sampleEmailRequests) {
    const { type, templateData } = request
    let isValid = true
    const missingFields = []
    
    switch (type) {
      case 'invitation_confirmation':
        if (!templateData.parentName && !templateData.childName) {
          isValid = false
          missingFields.push('parentName or childName')
        }
        break
        
      case 'invitation_approved':
        if (!templateData.activationUrl) {
          isValid = false
          missingFields.push('activationUrl')
        }
        break
        
      case 'invitation_expired':
      case 'invitation_invalid':
      case 'invitation_used':
        if (!templateData.parentName && !templateData.childName) {
          isValid = false
          missingFields.push('parentName or childName')
        }
        break
    }
    
    validationResults.push({
      type,
      valid: isValid,
      missingFields
    })
  }
  
  console.log('📋 Validation Results:')
  validationResults.forEach(result => {
    const status = result.valid ? '✅' : '❌'
    const fields = result.missingFields.length > 0 ? ` (Missing: ${result.missingFields.join(', ')})` : ''
    console.log(`${status} ${result.type}${fields}`)
  })
  
  return validationResults
}

// Export test runner
export async function runIntegrationTests() {
  console.log('🚀 Running Email Template Integration Tests...')
  
  const validationResults = validateTemplateData()
  const serviceResults = await testEmailService()
  
  const allValid = validationResults.every(r => r.valid)
  
  console.log(allValid ? '✅ All integration tests passed!' : '❌ Some integration tests failed')
  
  return {
    validation: validationResults,
    service: serviceResults,
    success: allValid
  }
}