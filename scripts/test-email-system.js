#!/usr/bin/env node

/**
 * Email Notification System Test Suite Runner
 * 
 * This script runs the comprehensive test suite for the email notification system,
 * including unit tests, integration tests, and security tests.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Running Email Notification System Test Suite\n');

const testCategories = [
  {
    name: 'Unit Tests - Email Service',
    pattern: 'supabase/functions/send-email/__tests__/*.test.ts',
    description: 'Testing email service functionality and Resend integration'
  },
  {
    name: 'Unit Tests - Token Management',
    pattern: 'supabase/functions/invitation-tokens/__tests__/*.test.ts',
    description: 'Testing token generation, validation, and security'
  },
  {
    name: 'Integration Tests - Invitation Flow',
    pattern: 'src/services/__tests__/invitationFlowIntegration.test.ts',
    description: 'Testing complete invitation workflow end-to-end'
  },
  {
    name: 'Template Rendering Tests',
    pattern: 'supabase/functions/send-email/__tests__/template-rendering.test.ts',
    description: 'Testing email template rendering and security'
  },
  {
    name: 'Security Tests - Token Generation',
    pattern: 'src/utils/__tests__/tokenSecurityTests.test.ts',
    description: 'Testing cryptographic security of token system'
  }
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

for (const category of testCategories) {
  console.log(`\n📋 ${category.name}`);
  console.log(`   ${category.description}`);
  console.log('   ' + '─'.repeat(60));
  
  try {
    const result = execSync(
      `npx vitest run --config vitest.email-system.config.ts "${category.pattern}" --reporter=verbose`,
      { 
        encoding: 'utf8',
        stdio: 'pipe'
      }
    );
    
    // Parse test results
    const lines = result.split('\n');
    const testLine = lines.find(line => line.includes('Test Files'));
    if (testLine) {
      const matches = testLine.match(/(\d+) passed/);
      if (matches) {
        const passed = parseInt(matches[1]);
        passedTests += passed;
        totalTests += passed;
        console.log(`   ✅ ${passed} tests passed`);
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Tests failed`);
    console.log(`   Error: ${error.message}`);
    failedTests++;
  }
}

console.log('\n' + '═'.repeat(80));
console.log('📊 Test Suite Summary');
console.log('═'.repeat(80));
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);

if (failedTests === 0) {
  console.log('\n🎉 All tests passed! Email notification system is ready.');
} else {
  console.log('\n⚠️  Some tests failed. Please review the errors above.');
  process.exit(1);
}

// Run coverage report
console.log('\n📈 Generating Coverage Report...');
try {
  execSync(
    'npx vitest run --config vitest.email-system.config.ts --coverage',
    { stdio: 'inherit' }
  );
} catch (error) {
  console.log('Coverage report generation failed:', error.message);
}