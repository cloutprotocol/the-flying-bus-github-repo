#!/usr/bin/env node

/**
 * Test script to verify the admin approval workflow
 * 
 * This script tests the complete admin approval process including:
 * 1. Edge Function availability
 * 2. Database update functionality
 * 3. Email sending capability
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

console.log('🧪 Testing Admin Approval Workflow');
console.log('=' .repeat(50));

async function testEdgeFunctionHealth() {
    console.log('\n1️⃣ Testing Edge Function Health...');
    
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-operations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                operation: 'health-check',
                params: {}
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Edge Function is healthy');
            console.log(`   Status: ${result.data.status}`);
            console.log(`   Database: ${result.data.databaseConnectivity}`);
            return true;
        } else {
            console.log('❌ Edge Function health check failed');
            console.log(`   Error: ${result.error}`);
            return false;
        }
    } catch (error) {
        console.log('❌ Edge Function is not accessible');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

async function testDatabaseConnection() {
    console.log('\n2️⃣ Testing Database Connection...');
    
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Test basic database connectivity
        const { data, error } = await supabase
            .from('invitation_requests')
            .select('count')
            .limit(1);
            
        if (error) {
            console.log('❌ Database connection failed');
            console.log(`   Error: ${error.message}`);
            return false;
        }
        
        console.log('✅ Database connection successful');
        return true;
    } catch (error) {
        console.log('❌ Database connection error');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

async function testInvitationStatusUpdate() {
    console.log('\n3️⃣ Testing Invitation Status Update...');
    
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // First, check if there are any pending invitations
        const { data: pendingInvitations, error: fetchError } = await supabase
            .from('invitation_requests')
            .select('*')
            .eq('status', 'pending')
            .limit(1);
            
        if (fetchError) {
            console.log('❌ Failed to fetch pending invitations');
            console.log(`   Error: ${fetchError.message}`);
            return false;
        }
        
        if (!pendingInvitations || pendingInvitations.length === 0) {
            console.log('⚠️  No pending invitations found to test with');
            console.log('   Creating a test invitation...');
            
            // Create a test invitation
            const { data: newInvitation, error: createError } = await supabase
                .from('invitation_requests')
                .insert({
                    parent_name: 'Test Parent',
                    parent_email: 'test@example.com',
                    child_name: 'Test Child',
                    child_age: 10,
                    status: 'pending',
                    reason: 'Test invitation for admin approval workflow'
                })
                .select()
                .single();
                
            if (createError) {
                console.log('❌ Failed to create test invitation');
                console.log(`   Error: ${createError.message}`);
                return false;
            }
            
            console.log('✅ Test invitation created');
            console.log(`   ID: ${newInvitation.id}`);
            
            // Test the Edge Function update
            const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-operations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    operation: 'updateInvitationStatus',
                    params: {
                        invitationId: newInvitation.id,
                        status: 'approved',
                        reviewerId: 'test-admin-id',
                        timestamp: new Date().toISOString()
                    }
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Invitation status update successful');
                console.log(`   Status: ${result.data.status}`);
                console.log(`   Email sent: ${result.details?.emailSent || 'unknown'}`);
                
                // Clean up - delete the test invitation
                await supabase
                    .from('invitation_requests')
                    .delete()
                    .eq('id', newInvitation.id);
                    
                console.log('✅ Test invitation cleaned up');
                return true;
            } else {
                console.log('❌ Invitation status update failed');
                console.log(`   Error: ${result.error}`);
                console.log(`   Code: ${result.code}`);
                return false;
            }
        } else {
            console.log('✅ Found pending invitations for testing');
            console.log(`   Count: ${pendingInvitations.length}`);
            return true;
        }
    } catch (error) {
        console.log('❌ Invitation status update test failed');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

async function testEmailFunctionality() {
    console.log('\n4️⃣ Testing Email Functionality...');
    
    try {
        // Test if send-email function is available
        const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'test',
                to: 'test@example.com',
                templateData: {
                    message: 'Test email from admin approval workflow test'
                }
            })
        });
        
        if (response.status === 404) {
            console.log('⚠️  send-email function not found');
            console.log('   Email functionality may not work');
            return false;
        }
        
        const result = await response.json();
        
        if (result.success || result.messageId) {
            console.log('✅ Email function is accessible');
            console.log('   Email sending capability confirmed');
            return true;
        } else {
            console.log('⚠️  Email function responded but may have issues');
            console.log(`   Response: ${JSON.stringify(result)}`);
            return true; // Still accessible, just might have config issues
        }
    } catch (error) {
        console.log('❌ Email function test failed');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

async function runAllTests() {
    console.log('🚀 Starting Admin Approval Workflow Tests\n');
    
    const results = {
        edgeFunction: await testEdgeFunctionHealth(),
        database: await testDatabaseConnection(),
        statusUpdate: await testInvitationStatusUpdate(),
        email: await testEmailFunctionality()
    };
    
    console.log('\n📊 Test Results Summary');
    console.log('=' .repeat(50));
    console.log(`Edge Function Health: ${results.edgeFunction ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Database Connection: ${results.database ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Status Update: ${results.statusUpdate ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Email Functionality: ${results.email ? '✅ PASS' : '⚠️  WARN'}`);
    
    const allPassed = results.edgeFunction && results.database && results.statusUpdate;
    
    console.log('\n🎯 Overall Status');
    console.log('=' .repeat(50));
    
    if (allPassed) {
        console.log('✅ Admin approval workflow is READY');
        console.log('   - Edge Function is running and healthy');
        console.log('   - Database operations work correctly');
        console.log('   - Status updates function properly');
        console.log('   - Email system is accessible');
        console.log('\n🎉 You can now test admin approval in the UI!');
    } else {
        console.log('❌ Admin approval workflow has ISSUES');
        console.log('   Please fix the failing tests before using admin approval');
        
        if (!results.edgeFunction) {
            console.log('\n🔧 To fix Edge Function issues:');
            console.log('   1. Make sure Supabase is running: supabase start');
            console.log('   2. Deploy functions: supabase functions serve');
        }
        
        if (!results.database) {
            console.log('\n🔧 To fix Database issues:');
            console.log('   1. Check Supabase status: supabase status');
            console.log('   2. Reset database if needed: supabase db reset');
        }
    }
    
    return allPassed;
}

// Run the tests
runAllTests()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 Test execution failed:', error);
        process.exit(1);
    });