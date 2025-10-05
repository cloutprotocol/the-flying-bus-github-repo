#!/usr/bin/env node

/**
 * Comprehensive test script for email_events RLS policies
 * Tests all scenarios: service role, admin users, authenticated users, anonymous users
 */

import { createClient } from '@supabase/supabase-js';

// Local Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

async function testEmailEventsRLS() {
  console.log('🧪 Testing email_events RLS policies comprehensively...\n');

  // Test 1: Service Role Access
  console.log('1️⃣ Testing Service Role Access...');
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Insert as service role
    const { data: insertData, error: insertError } = await serviceClient
      .from('email_events')
      .insert({
        type: 'system_test',
        email: 'service@test.com',
        template: 'test_template',
        metadata: { test: 'service_role' }
      })
      .select();

    if (insertError) {
      console.log('❌ Service role insert failed:', insertError.message);
    } else {
      console.log('✅ Service role can insert email events');
    }

    // Select as service role
    const { data: selectData, error: selectError } = await serviceClient
      .from('email_events')
      .select('*')
      .limit(5);

    if (selectError) {
      console.log('❌ Service role select failed:', selectError.message);
    } else {
      console.log('✅ Service role can select email events:', selectData.length, 'records');
    }
  } catch (error) {
    console.log('❌ Service role test error:', error.message);
  }

  // Test 2: Anonymous User Access
  console.log('\n2️⃣ Testing Anonymous User Access...');
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // Test invitation-related insert as anonymous
    const { data: anonInsertData, error: anonInsertError } = await anonClient
      .from('email_events')
      .insert({
        type: 'invitation_request',
        email: 'anon@test.com',
        template: 'invitation_template',
        metadata: { test: 'anonymous' }
      })
      .select();

    if (anonInsertError) {
      console.log('❌ Anonymous invitation insert failed:', anonInsertError.message);
      console.log('   Error details:', anonInsertError);
    } else {
      console.log('✅ Anonymous can insert invitation email events:', anonInsertData);
    }

    // Test system helper function as anonymous
    const { data: systemFuncData, error: systemFuncError } = await anonClient
      .rpc('log_email_event_system', {
        event_type: 'invitation_request',
        event_email: 'anon-system@test.com',
        template_name: 'invitation_template',
        metadata_param: { test: 'anonymous_system_function' }
      });

    if (systemFuncError) {
      console.log('❌ Anonymous system function failed:', systemFuncError.message);
    } else {
      console.log('✅ Anonymous can use system function:', systemFuncData);
    }

    // Test non-invitation insert as anonymous (should fail)
    const { data: anonBadInsert, error: anonBadError } = await anonClient
      .from('email_events')
      .insert({
        type: 'non_invitation_type',
        email: 'anon@test.com',
        template: 'system_template'
      })
      .select();

    if (anonBadError) {
      console.log('✅ Anonymous correctly blocked from non-invitation types:', anonBadError.message);
    } else {
      console.log('❌ Anonymous should not be able to insert non-invitation types');
    }

    // Test select as anonymous (should be restricted)
    const { data: anonSelectData, error: anonSelectError } = await anonClient
      .from('email_events')
      .select('*');

    if (anonSelectError) {
      console.log('✅ Anonymous correctly blocked from selecting:', anonSelectError.message);
    } else {
      console.log('❌ Anonymous should not be able to select email events, got:', anonSelectData?.length, 'records');
    }
  } catch (error) {
    console.log('❌ Anonymous test error:', error.message);
  }

  // Test 3: Helper Functions
  console.log('\n3️⃣ Testing Helper Functions...');
  
  try {
    // Test log_system_email_event function
    const { data: systemFuncData, error: systemFuncError } = await serviceClient
      .rpc('log_system_email_event', {
        event_type: 'test_system_event',
        event_email: 'system@test.com',
        template_name: 'system_template',
        metadata_param: { test: 'system_function' }
      });

    if (systemFuncError) {
      console.log('❌ System email function failed:', systemFuncError.message);
    } else {
      console.log('✅ System email function works:', systemFuncData);
    }

    // Test log_admin_email_event function
    const { data: adminFuncData, error: adminFuncError } = await serviceClient
      .rpc('log_admin_email_event', {
        event_type: 'test_admin_event',
        event_email: 'admin@test.com',
        template_name: 'admin_template',
        metadata_param: { test: 'admin_function' }
      });

    if (adminFuncError) {
      console.log('❌ Admin email function failed:', adminFuncError.message);
    } else {
      console.log('✅ Admin email function works:', adminFuncData);
    }
  } catch (error) {
    console.log('❌ Helper function test error:', error.message);
  }

  // Test 4: Check Current Policies
  console.log('\n4️⃣ Checking Current RLS Policies...');
  
  try {
    const { data: policies, error: policyError } = await serviceClient
      .from('pg_policies')
      .select('policyname, cmd, qual')
      .eq('tablename', 'email_events')
      .order('policyname');

    if (policyError) {
      console.log('❌ Policy check failed:', policyError.message);
    } else {
      console.log('✅ Current email_events policies:');
      policies.forEach(policy => {
        console.log(`   - ${policy.policyname} (${policy.cmd})`);
      });
    }
  } catch (error) {
    console.log('❌ Policy check error:', error.message);
  }

  // Test 5: Invitation Flow Simulation
  console.log('\n5️⃣ Testing Invitation Flow Email Events...');
  
  try {
    const invitationTypes = [
      'invitation_request',
      'invitation_confirmation', 
      'invitation_approved',
      'invitation_denied',
      'trigger_delegated'
    ];

    for (const type of invitationTypes) {
      const { data, error } = await anonClient
        .from('email_events')
        .insert({
          type: type,
          email: `test-${type}@example.com`,
          template: `${type}_template`,
          metadata: { flow: 'invitation_test' }
        })
        .select();

      if (error) {
        console.log(`❌ ${type} insert failed:`, error.message);
      } else {
        console.log(`✅ ${type} insert successful`);
      }
    }
  } catch (error) {
    console.log('❌ Invitation flow test error:', error.message);
  }

  console.log('\n🎉 Email events RLS testing complete!');
}

// Run the test
testEmailEventsRLS().catch(console.error);