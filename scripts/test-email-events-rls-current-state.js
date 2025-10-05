#!/usr/bin/env node

/**
 * Test script to verify current state of email_events RLS policies
 * This script tests the specific issues mentioned in task 4
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create clients for different contexts
const anonClient = createClient(supabaseUrl, supabaseAnonKey);
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

async function testCurrentRLSPolicies() {
  console.log('🔍 Testing current email_events RLS policies...\n');

  // Test 1: Check current policies
  console.log('1. Checking current RLS policies on email_events table:');
  try {
    const { data: policies, error } = await serviceClient
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'email_events');
    
    if (error) {
      console.error('❌ Error fetching policies:', error.message);
    } else {
      console.log('✅ Current policies:');
      policies.forEach(policy => {
        console.log(`   - ${policy.policyname}: ${policy.cmd} (${policy.qual})`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n2. Testing anonymous user email event insertion (invitation request):');
  try {
    const { data, error } = await anonClient
      .from('email_events')
      .insert({
        type: 'invitation_request',
        email: 'test-anon@example.com',
        template: 'invitation_confirmation',
        metadata: { test: 'anonymous_insertion' }
      })
      .select();

    if (error) {
      console.error('❌ Anonymous insertion failed:', error.message);
    } else {
      console.log('✅ Anonymous insertion successful:', data[0]?.id);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n3. Testing service role email event insertion:');
  try {
    const { data, error } = await serviceClient
      .from('email_events')
      .insert({
        type: 'invitation_approved',
        email: 'test-service@example.com',
        template: 'invitation_approved',
        metadata: { test: 'service_role_insertion' }
      })
      .select();

    if (error) {
      console.error('❌ Service role insertion failed:', error.message);
    } else {
      console.log('✅ Service role insertion successful:', data[0]?.id);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n4. Testing admin user simulation (checking if admin policies exist):');
  try {
    // First check if we have any admin users
    const { data: adminUsers, error: adminError } = await serviceClient
      .from('profiles')
      .select('id, email, role')
      .in('role', ['admin', 'moderator'])
      .limit(1);

    if (adminError) {
      console.error('❌ Error fetching admin users:', adminError.message);
    } else if (adminUsers.length === 0) {
      console.log('⚠️  No admin users found in profiles table');
    } else {
      console.log('✅ Found admin user:', adminUsers[0].email, 'with role:', adminUsers[0].role);
      
      // Test if admin can insert email events (this would require authenticated client with admin user)
      console.log('   Note: Full admin test requires authenticated session with admin user');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n5. Testing helper functions existence:');
  try {
    const { data: functions, error } = await serviceClient.rpc('pg_get_functiondef', {
      funcid: 'log_admin_email_event'
    });

    if (error) {
      console.error('❌ log_admin_email_event function not found:', error.message);
    } else {
      console.log('✅ log_admin_email_event function exists');
    }
  } catch (error) {
    console.error('❌ log_admin_email_event function not found');
  }

  try {
    const { data: functions, error } = await serviceClient.rpc('pg_get_functiondef', {
      funcid: 'log_system_email_event'
    });

    if (error) {
      console.error('❌ log_system_email_event function not found:', error.message);
    } else {
      console.log('✅ log_system_email_event function exists');
    }
  } catch (error) {
    console.error('❌ log_system_email_event function not found');
  }

  console.log('\n6. Testing email event viewing permissions:');
  try {
    const { data, error } = await anonClient
      .from('email_events')
      .select('id, type, email')
      .limit(5);

    if (error) {
      console.error('❌ Anonymous viewing failed:', error.message);
    } else {
      console.log('✅ Anonymous can view', data.length, 'email events');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n📋 Summary:');
  console.log('This test checks the current state of email_events RLS policies.');
  console.log('Issues found will indicate what needs to be fixed in the migration.');
}

// Run the test
testCurrentRLSPolicies().catch(console.error);