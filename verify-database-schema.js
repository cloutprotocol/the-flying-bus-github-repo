// Simple verification script to test database schema
// This script verifies that the new tables and functions exist

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDatabaseSchema() {
  console.log('🔍 Verifying database schema...');
  
  try {
    // Test 1: Check if invitation_tokens table exists
    console.log('1. Testing invitation_tokens table...');
    const { data: tokensData, error: tokensError } = await supabase
      .from('invitation_tokens')
      .select('count')
      .limit(1);
    
    if (tokensError) {
      console.error('❌ invitation_tokens table not accessible:', tokensError.message);
      return false;
    }
    console.log('✅ invitation_tokens table exists and is accessible');

    // Test 2: Check if email_notifications table exists
    console.log('2. Testing email_notifications table...');
    const { data: emailData, error: emailError } = await supabase
      .from('email_notifications')
      .select('count')
      .limit(1);
    
    if (emailError) {
      console.error('❌ email_notifications table not accessible:', emailError.message);
      return false;
    }
    console.log('✅ email_notifications table exists and is accessible');

    // Test 3: Check if invitation_requests table has new columns
    console.log('3. Testing enhanced invitation_requests table...');
    const { data: requestsData, error: requestsError } = await supabase
      .from('invitation_requests')
      .select('invitation_claimed_at, notification_sent_at, notification_status')
      .limit(1);
    
    if (requestsError) {
      console.error('❌ invitation_requests table missing new columns:', requestsError.message);
      return false;
    }
    console.log('✅ invitation_requests table has new columns');

    // Test 4: Check if database functions exist
    console.log('4. Testing database functions...');
    
    // Test validate_invitation_token function
    const { data: validateData, error: validateError } = await supabase
      .rpc('validate_invitation_token', { token_input: 'test-token' });
    
    if (validateError && !validateError.message.includes('no rows returned')) {
      console.error('❌ validate_invitation_token function not accessible:', validateError.message);
      return false;
    }
    console.log('✅ validate_invitation_token function exists');

    // Test cleanup_expired_tokens function
    const { data: cleanupData, error: cleanupError } = await supabase
      .rpc('cleanup_expired_tokens');
    
    if (cleanupError) {
      console.error('❌ cleanup_expired_tokens function not accessible:', cleanupError.message);
      return false;
    }
    console.log('✅ cleanup_expired_tokens function exists');

    console.log('\n🎉 All database schema verification tests passed!');
    console.log('📊 Database is ready for the invitation approval workflow');
    return true;

  } catch (error) {
    console.error('❌ Unexpected error during verification:', error);
    return false;
  }
}

// Run verification
verifyDatabaseSchema()
  .then(success => {
    if (success) {
      console.log('\n✅ Database schema verification completed successfully');
      process.exit(0);
    } else {
      console.log('\n❌ Database schema verification failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Verification script failed:', error);
    process.exit(1);
  });