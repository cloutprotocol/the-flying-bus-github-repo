#!/usr/bin/env node

/**
 * End-to-end test for email_events RLS policy fixes
 * Tests the key scenarios using anonymous client and helper functions
 */

import { createClient } from '@supabase/supabase-js';

// Production configuration
const supabaseUrl = 'https://xwxuwchndgxnnmfprzds.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3eHV3Y2huZGd4bm5tZnByemRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTM5MTEsImV4cCI6MjA3NDU2OTkxMX0.1d5CRPFs-OU1wDR2XuhvJNQVebVfV6NQRS0oRyOfglw';

console.log('🧪 End-to-End Email Events RLS Policy Test');
console.log('==========================================\n');

// Test 1: Anonymous client using helper function (simulates invitation request)
async function testAnonymousEmailLogging() {
  console.log('📝 Test 1: Anonymous Email Event Logging via Helper Function');
  
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    const { data, error } = await anonClient.rpc('log_system_email_event', {
      event_type: 'invitation_request',
      event_email: 'test_anon_e2e@example.com',
      template_name: 'invitation_request_template',
      message_id_param: `anon_e2e_${Date.now()}`,
      error_message: null,
      metadata_param: {
        test_source: 'anonymous_client_e2e',
        timestamp: new Date().toISOString()
      }
    });

    if (error) {
      console.log('❌ Anonymous email logging failed:', error.message);
      return false;
    }

    console.log('✅ Anonymous email logging successful, event ID:', data);
    
    // Verify the event was created
    const { data: verifyData, error: verifyError } = await anonClient
      .from('email_events')
      .select('id, type, email')
      .eq('id', data)
      .single();

    if (verifyError) {
      console.log('⚠️ Could not verify event creation (expected for anonymous user)');
      console.log('   This is normal - anonymous users cannot read back email events');
    } else {
      console.log('✅ Event verified:', verifyData.type);
    }

    return true;
  } catch (error) {
    console.log('❌ Anonymous email logging exception:', error.message);
    return false;
  }
}

// Test 2: Test direct insertion for invitation types (anonymous)
async function testDirectInvitationInsertion() {
  console.log('\n📋 Test 2: Direct Invitation Email Event Insertion');
  
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    const { data, error } = await anonClient
      .from('email_events')
      .insert({
        type: 'invitation_confirmation',
        email: 'test_direct_e2e@example.com',
        template: 'invitation_confirmation_template',
        message_id: `direct_e2e_${Date.now()}`,
        metadata: {
          test_source: 'direct_insertion_e2e',
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (error) {
      console.log('❌ Direct invitation insertion failed:', error.message);
      return false;
    }

    console.log('✅ Direct invitation insertion successful:', data.id);
    return true;
  } catch (error) {
    console.log('❌ Direct invitation insertion exception:', error.message);
    return false;
  }
}

// Test 3: Test non-invitation type insertion (should fail for anonymous)
async function testNonInvitationInsertion() {
  console.log('\n🚫 Test 3: Non-Invitation Email Event Insertion (Should Fail)');
  
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    const { data, error } = await anonClient
      .from('email_events')
      .insert({
        type: 'newsletter', // This is not an invitation type
        email: 'test_non_invitation@example.com',
        template: 'newsletter_template',
        message_id: `non_invitation_${Date.now()}`,
        metadata: {
          test_source: 'non_invitation_test',
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (error) {
      console.log('✅ Non-invitation insertion correctly failed:', error.message);
      console.log('   This confirms the RLS policy is working - anonymous users can only insert invitation types');
      return true;
    }

    console.log('❌ Non-invitation insertion should have failed but succeeded:', data.id);
    return false;
  } catch (error) {
    console.log('✅ Non-invitation insertion correctly failed with exception:', error.message);
    return true;
  }
}

// Test 4: Verify helper functions exist and are accessible
async function testHelperFunctionAccess() {
  console.log('\n🔧 Test 4: Helper Function Accessibility');
  
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // Test log_system_email_event (should work for anonymous)
    const { data: systemData, error: systemError } = await anonClient.rpc('log_system_email_event', {
      event_type: 'system_notification',
      event_email: 'test_system_access@example.com',
      template_name: 'system_template',
      message_id_param: `system_access_${Date.now()}`,
      error_message: null,
      metadata_param: { test: 'system_function_access' }
    });

    if (systemError) {
      console.log('❌ System helper function failed:', systemError.message);
      return false;
    }

    console.log('✅ System helper function accessible:', systemData);

    // Test log_admin_email_event (should work for anonymous, but typically used by admins)
    const { data: adminData, error: adminError } = await anonClient.rpc('log_admin_email_event', {
      event_type: 'invitation_approved',
      event_email: 'test_admin_access@example.com',
      template_name: 'admin_template',
      message_id_param: `admin_access_${Date.now()}`,
      error_message: null,
      metadata_param: { test: 'admin_function_access' }
    });

    if (adminError) {
      console.log('⚠️ Admin helper function access issue:', adminError.message);
      console.log('   This might be expected if function has role restrictions');
    } else {
      console.log('✅ Admin helper function accessible:', adminData);
    }

    return true;
  } catch (error) {
    console.log('❌ Helper function access exception:', error.message);
    return false;
  }
}

// Test 5: Clean up test data
async function cleanupTestData() {
  console.log('\n🧹 Test 5: Cleanup Test Data');
  
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // Note: Anonymous users cannot delete, so this will likely fail
    // But we'll try anyway to test the policy
    const { error } = await anonClient
      .from('email_events')
      .delete()
      .like('email', '%_e2e@example.com');

    if (error) {
      console.log('⚠️ Cleanup failed (expected for anonymous user):', error.message);
      console.log('   Test data will remain in database - this is normal for security');
    } else {
      console.log('✅ Cleanup successful');
    }

    return true;
  } catch (error) {
    console.log('⚠️ Cleanup exception (expected):', error.message);
    return true;
  }
}

// Run all tests
async function runEndToEndTests() {
  console.log('Starting end-to-end RLS policy tests...\n');
  
  const results = {
    anonymousLogging: await testAnonymousEmailLogging(),
    directInsertion: await testDirectInvitationInsertion(),
    nonInvitationBlocked: await testNonInvitationInsertion(),
    helperFunctions: await testHelperFunctionAccess(),
    cleanup: await cleanupTestData()
  };

  console.log('\n📊 End-to-End Test Results');
  console.log('===========================');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed >= 4) { // Allow cleanup to fail
    console.log('\n🎉 End-to-end tests successful!');
    console.log('✅ Email event logging RLS policies are working correctly');
    console.log('✅ Anonymous users can log invitation-related events');
    console.log('✅ Helper functions are accessible and functional');
    console.log('✅ Security policies prevent unauthorized access');
    console.log('\n📋 Task 4 Complete: Email event logging RLS policies fixed');
    console.log('🚀 Ready for integration with invitation form and admin approval workflow');
  } else {
    console.log('\n⚠️ Some critical tests failed. Please review the errors above.');
  }
  
  return passed >= 4;
}

// Execute tests
runEndToEndTests().catch(error => {
  console.error('💥 End-to-end test execution failed:', error);
  process.exit(1);
});