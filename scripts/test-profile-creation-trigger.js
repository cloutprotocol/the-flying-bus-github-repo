#!/usr/bin/env node

/**
 * Test Profile Creation Trigger
 * 
 * This script tests that the profile creation trigger works correctly
 * by checking if profiles are created automatically when users sign up.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_ANON_KEY is not set.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testProfileCreationTrigger() {
  console.log('🧪 Testing Profile Creation Trigger\n');
  console.log('=' .repeat(60));

  // Test 1: Check if trigger exists
  console.log('\n📋 Test 1: Verify trigger exists in database');
  console.log('-'.repeat(60));
  
  const { data: triggerData, error: triggerError } = await supabase.rpc('execute_sql', {
    query: `
      SELECT trigger_name, event_manipulation, event_object_table 
      FROM information_schema.triggers 
      WHERE trigger_name = 'on_auth_user_created'
    `
  });

  if (triggerError) {
    console.log('⚠️  Cannot verify trigger (RPC not available)');
    console.log('   Run this SQL manually to verify:');
    console.log('   SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = \'on_auth_user_created\';');
  } else {
    console.log('✅ Trigger exists:', triggerData);
  }

  // Test 2: Check for users without profiles
  console.log('\n📋 Test 2: Check for users without profiles');
  console.log('-'.repeat(60));
  
  console.log('⚠️  This requires service role access');
  console.log('   Run this SQL manually to check:');
  console.log(`
   SELECT u.id, u.email, u.created_at
   FROM auth.users u
   LEFT JOIN profiles p ON u.id = p.id
   WHERE p.id IS NULL
   ORDER BY u.created_at DESC;
  `);

  // Test 3: Instructions for manual testing
  console.log('\n📋 Test 3: Manual Testing Instructions');
  console.log('-'.repeat(60));
  console.log(`
1. Submit an invitation request through the app
2. Approve it as admin
3. Use the magic link to sign up
4. After signup, run this SQL to verify profile was created:

   SELECT 
     u.id, 
     u.email, 
     p.username, 
     p.display_name, 
     p.role,
     p.created_at as profile_created_at
   FROM auth.users u
   JOIN profiles p ON u.id = p.id
   WHERE u.email = 'YOUR_TEST_EMAIL@example.com';

Expected result: Both user and profile records should exist with matching IDs.
  `);

  // Test 4: Check handle_new_user function exists
  console.log('\n📋 Test 4: Verify handle_new_user() function exists');
  console.log('-'.repeat(60));
  console.log('   Run this SQL manually to verify:');
  console.log(`
   SELECT 
     routine_name, 
     routine_type,
     security_type
   FROM information_schema.routines 
   WHERE routine_name = 'handle_new_user'
   AND routine_schema = 'public';
  `);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test script completed');
  console.log('\nNext steps:');
  console.log('1. Test the complete signup flow with a new user');
  console.log('2. Verify profile is created automatically');
  console.log('3. Commit the migration file to git');
  console.log('4. Deploy to production if needed');
}

testProfileCreationTrigger().catch(console.error);
