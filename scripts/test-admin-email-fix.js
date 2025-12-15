#!/usr/bin/env node

/**
 * Test script to verify the admin email fix
 * 
 * This script tests that admin approval emails are sent correctly
 * using the same pattern as the working form submission emails.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set.');
  process.exit(1);
}

console.log('🧪 Testing Admin Email Fix');
console.log('=' .repeat(50));

async function testEmailFunctionDirectly() {
    console.log('\n1️⃣ Testing send-email function directly with invitation_approved type...');
    
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // First create a test invitation in approved status
        const { data: testInvitation, error: createError } = await supabase
            .from('invitation_requests')
            .insert({
                parent_name: 'Test Parent Email',
                parent_email: 'test-email@example.com',
                child_name: 'Test Child Email',
                child_age: 10,
                status: 'approved'
            })
            .select()
            .single();
            
        if (createError) {
            console.log('❌ Failed to create test invitation');
            console.log(`   Error: ${createError.message}`);
            return false;
        }
        
        console.log('✅ Test invitation created with ID:', testInvitation.id);
        
        // Test the send-email function directly (same as working form submission)
        const emailData = {
            type: 'invitation_approved',
            to: testInvitation.parent_email,
            templateData: {
                invitationId: testInvitation.id, // Required for token generation
                parentName: testInvitation.parent_name,
                childName: testInvitation.child_name
            }
        };
        
        console.log('📧 Calling send-email function with data:', {
            type: emailData.type,
            to: emailData.to,
            invitationId: emailData.templateData.invitationId
        });
        
        const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-email', {
            body: emailData
        });
        
        if (emailError) {
            console.log('❌ Email function call failed');
            console.log(`   Error: ${emailError.message}`);
            
            // Clean up
            await supabase.from('invitation_requests').delete().eq('id', testInvitation.id);
            return false;
        }
        
        if (emailResponse.success) {
            console.log('✅ Email sent successfully!');
            console.log(`   Message ID: ${emailResponse.messageId}`);
            console.log('   This means the email pattern is working correctly');
        } else {
            console.log('❌ Email function returned error');
            console.log(`   Error: ${emailResponse.error}`);
            
            // Clean up
            await supabase.from('invitation_requests').delete().eq('id', testInvitation.id);
            return false;
        }
        
        // Clean up
        await supabase.from('invitation_requests').delete().eq('id', testInvitation.id);
        console.log('✅ Test invitation cleaned up');
        
        return true;
        
    } catch (error) {
        console.log('❌ Test failed with exception');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

async function testAdminOperationsEmailFlow() {
    console.log('\n2️⃣ Testing admin-operations function email flow...');
    
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Create a test invitation in pending status
        const { data: testInvitation, error: createError } = await supabase
            .from('invitation_requests')
            .insert({
                parent_name: 'Test Admin Parent',
                parent_email: 'test-admin@example.com',
                child_name: 'Test Admin Child',
                child_age: 10,
                status: 'pending'
            })
            .select()
            .single();
            
        if (createError) {
            console.log('❌ Failed to create test invitation');
            console.log(`   Error: ${createError.message}`);
            return false;
        }
        
        console.log('✅ Test invitation created with ID:', testInvitation.id);
        
        // Test the admin-operations function updateInvitationStatus
        const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-operations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                operation: 'updateInvitationStatus',
                params: {
                    invitationId: testInvitation.id,
                    status: 'approved',
                    reviewerId: '81ecf0fb-f0fe-4f9e-b30f-bd7c1e65e62d', // Use existing user
                    timestamp: new Date().toISOString()
                }
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Admin operation successful');
            console.log(`   Status updated: ${result.details?.statusUpdated}`);
            console.log(`   Email sent: ${result.details?.emailSent}`);
            
            if (result.details?.emailSent) {
                console.log('🎉 EMAIL WAS SENT SUCCESSFULLY!');
                console.log('   The admin approval email flow is now working');
            } else {
                console.log('⚠️  Status updated but email was not sent');
                console.log(`   Email error: ${result.details?.emailError}`);
            }
        } else {
            console.log('❌ Admin operation failed');
            console.log(`   Error: ${result.error}`);
            
            // Clean up
            await supabase.from('invitation_requests').delete().eq('id', testInvitation.id);
            return false;
        }
        
        // Clean up
        await supabase.from('invitation_requests').delete().eq('id', testInvitation.id);
        console.log('✅ Test invitation cleaned up');
        
        return result.details?.emailSent || false;
        
    } catch (error) {
        console.log('❌ Test failed with exception');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

async function runEmailTests() {
    console.log('🚀 Starting Admin Email Fix Tests\n');
    
    const results = {
        directEmail: await testEmailFunctionDirectly(),
        adminFlow: await testAdminOperationsEmailFlow()
    };
    
    console.log('\n📊 Test Results Summary');
    console.log('=' .repeat(50));
    console.log(`Direct Email Function: ${results.directEmail ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Admin Operations Flow: ${results.adminFlow ? '✅ PASS' : '❌ FAIL'}`);
    
    console.log('\n🎯 Overall Status');
    console.log('=' .repeat(50));
    
    if (results.directEmail && results.adminFlow) {
        console.log('✅ Admin email fix is WORKING!');
        console.log('   - Direct email function works correctly');
        console.log('   - Admin approval flow sends emails');
        console.log('   - Token generation is functioning');
        console.log('\n🎉 Admin approval emails should now work in the UI!');
    } else if (results.directEmail && !results.adminFlow) {
        console.log('⚠️  Email function works but admin flow has issues');
        console.log('   - The send-email function is working correctly');
        console.log('   - The admin-operations function needs to be restarted');
        console.log('\n🔧 Solution: Restart Edge Functions to pick up changes');
        console.log('   Stop the current supabase functions serve process');
        console.log('   Run: supabase functions serve --no-verify-jwt');
    } else if (!results.directEmail) {
        console.log('❌ Email function has issues');
        console.log('   - Check Resend API key configuration');
        console.log('   - Verify environment variables are set');
        console.log('   - Check Edge Functions are running');
    } else {
        console.log('❌ Both tests failed');
        console.log('   - Check Supabase is running: supabase status');
        console.log('   - Check Edge Functions: supabase functions serve');
        console.log('   - Verify environment variables');
    }
    
    return results.directEmail && results.adminFlow;
}

// Run the tests
runEmailTests()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 Test execution failed:', error);
        process.exit(1);
    });
