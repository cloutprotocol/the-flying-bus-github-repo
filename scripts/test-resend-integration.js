#!/usr/bin/env node

/**
 * Test Resend Integration
 * 
 * This script tests that the Resend email service is working
 * through the local Supabase Edge Functions.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_ANON_KEY is not set.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testResendIntegration() {
  console.log('🧪 Testing Resend Integration\n');
  console.log('=' .repeat(60));

  // Test 1: Check Edge Function health
  console.log('\n📋 Test 1: Check Edge Function health');
  console.log('-'.repeat(60));
  
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        type: 'invitation_confirmation',
        to: 'test@example.com',
        templateData: {
          parentName: 'Test Parent',
          childName: 'Test Child',
          invitationId: 'test-123'
        }
      }
    });

    if (error) {
      console.log('⚠️  Edge Function error (expected for test email):', error.message);
      
      // Check if it's a Resend-related error or function error
      if (error.message.includes('Resend') || error.message.includes('API')) {
        console.log('✅ Edge Function is running and connecting to Resend API');
      } else {
        console.log('❌ Edge Function may not be configured correctly');
      }
    } else {
      console.log('✅ Edge Function responded successfully:', data);
    }

  } catch (error) {
    console.error('❌ Edge Function test failed:', error.message);
  }

  // Test 2: Check if Resend API key is configured
  console.log('\n📋 Test 2: Check Resend configuration');
  console.log('-'.repeat(60));
  
  try {
    // Try to invoke with a test payload to see configuration status
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        type: 'test_configuration'
      }
    });

    if (error) {
      console.log('Response error:', error.message);
      
      if (error.message.includes('Missing required fields')) {
        console.log('✅ Edge Function is running and validating input');
      } else if (error.message.includes('Resend')) {
        console.log('⚠️  Resend API issue detected');
      }
    }

  } catch (error) {
    console.error('Configuration test error:', error.message);
  }

  // Test 3: Manual curl test instructions
  console.log('\n📋 Test 3: Manual testing instructions');
  console.log('-'.repeat(60));
  console.log(`
To test Resend manually, run this curl command:

curl -X POST "http://127.0.0.1:54321/functions/v1/send-email" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \\
  -d '{
    "type": "invitation_confirmation",
    "to": "your-email@example.com",
    "templateData": {
      "parentName": "Test Parent",
      "childName": "Test Child",
      "invitationId": "test-123"
    }
  }'

Expected responses:
- ✅ Success: {"success": true, "messageId": "..."}
- ⚠️  Resend error: {"error": "...resend api..."}
- ❌ Function error: {"error": "Missing required fields..."}
  `);

  console.log('\n📋 Test 4: Check local email capture (Mailpit)');
  console.log('-'.repeat(60));
  console.log(`
If emails are being sent locally, check Mailpit:
- URL: http://127.0.0.1:54324
- This captures all outgoing emails in local development
- Look for emails from admin@theflyingbus.org
  `);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Resend integration test completed');
  console.log('\nNext steps:');
  console.log('1. Check Mailpit (http://127.0.0.1:54324) for captured emails');
  console.log('2. Try submitting an invitation form in the web app');
  console.log('3. Check Edge Function logs if emails still not working');
  console.log('4. Verify Resend API key is valid and has sending permissions');
}

testResendIntegration().catch(console.error);
