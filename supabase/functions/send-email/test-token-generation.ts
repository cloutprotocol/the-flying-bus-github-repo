#!/usr/bin/env -S deno run --allow-net --allow-env

/**
 * Test script for the enhanced send-email function with token generation
 * This tests the invitation_approved email type with integrated token generation
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://sutvexycbiiarpkugzpv.supabase.co'
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''

async function testTokenGeneration() {
  console.log('🧪 Testing enhanced send-email function with token generation...')
  
  // Test data for invitation approval email
  const testRequest = {
    type: 'invitation_approved',
    to: 'test@example.com',
    templateData: {
      invitationId: '123e4567-e89b-12d3-a456-426614174000', // Mock UUID
      parentName: 'John Doe',
      childName: 'Jane Doe'
    }
  }

  try {
    console.log('📤 Sending test request to send-email function...')
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testRequest)
    })

    console.log('📥 Response status:', response.status)
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()))

    const result = await response.json()
    console.log('📥 Response body:', JSON.stringify(result, null, 2))

    if (response.ok && result.success) {
      console.log('✅ Test passed: Email sent successfully with token generation')
      console.log('📧 Message ID:', result.messageId)
    } else {
      console.log('❌ Test failed:', result.error)
      if (result.code) {
        console.log('🔍 Error code:', result.code)
      }
    }

  } catch (error) {
    console.error('💥 Test error:', error)
  }
}

async function testHealthCheck() {
  console.log('\n🏥 Testing health check endpoint...')
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    })

    const result = await response.json()
    console.log('🏥 Health check result:', JSON.stringify(result, null, 2))

    if (result.status === 'healthy') {
      console.log('✅ Health check passed')
    } else {
      console.log('⚠️ Health check shows issues')
    }

  } catch (error) {
    console.error('💥 Health check error:', error)
  }
}

async function testMissingInvitationId() {
  console.log('\n🧪 Testing validation: missing invitationId...')
  
  const testRequest = {
    type: 'invitation_approved',
    to: 'test@example.com',
    templateData: {
      parentName: 'John Doe',
      childName: 'Jane Doe'
      // Missing invitationId
    }
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testRequest)
    })

    const result = await response.json()
    console.log('📥 Validation test result:', JSON.stringify(result, null, 2))

    if (response.status === 400 && result.error?.includes('invitationId')) {
      console.log('✅ Validation test passed: Correctly rejected missing invitationId')
    } else {
      console.log('❌ Validation test failed: Should have rejected missing invitationId')
    }

  } catch (error) {
    console.error('💥 Validation test error:', error)
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting send-email function tests with token generation...\n')
  
  await testHealthCheck()
  await testMissingInvitationId()
  await testTokenGeneration()
  
  console.log('\n🏁 Tests completed!')
}

if (import.meta.main) {
  runTests()
}