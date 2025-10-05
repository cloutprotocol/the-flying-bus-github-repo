/**
 * Test Runner for Invitation Workflow Integration Tests
 * 
 * Executes all invitation workflow integration tests and generates a comprehensive report.
 * This script can be run to validate the complete invitation system functionality.
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface TestResult {
  testFile: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: string[];
}

interface TestSuite {
  name: string;
  description: string;
  testFiles: string[];
  requirements: string[];
}

const testSuites: TestSuite[] = [
  {
    name: 'Core Invitation Workflow',
    description: 'Tests the complete invitation workflow from submission to approval',
    testFiles: [
      'src/test/integration/invitationWorkflow.integration.test.tsx'
    ],
    requirements: ['1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '3.3']
  },
  {
    name: 'Edge Cases and Error Scenarios',
    description: 'Tests edge cases, error handling, and boundary conditions',
    testFiles: [
      'src/test/integration/invitationWorkflowEdgeCases.integration.test.tsx'
    ],
    requirements: ['1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '3.3']
  },
  {
    name: 'Existing Integration Tests',
    description: 'Existing integration tests for invitation system components',
    testFiles: [
      'src/test/RequestInvitation.auth-context.test.tsx',
      'src/test/errorHandling.integration.test.tsx',
      'src/services/__tests__/invitationService.test.ts',
      'src/services/__tests__/adminService.test.ts'
    ],
    requirements: ['1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '3.3']
  }
];

async function runTestSuite(suite: TestSuite): Promise<TestResult[]> {
  console.log(`\n🧪 Running Test Suite: ${suite.name}`);
  console.log(`📝 Description: ${suite.description}`);
  console.log(`📋 Requirements: ${suite.requirements.join(', ')}`);
  console.log(`📁 Test Files: ${suite.testFiles.length}`);

  const results: TestResult[] = [];

  for (const testFile of suite.testFiles) {
    console.log(`\n  ▶️  Running: ${testFile}`);
    
    try {
      const startTime = Date.now();
      
      // Run the test file
      const output = execSync(`npm run test -- --run "${testFile}"`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      
      const duration = Date.now() - startTime;
      
      // Parse test results from output
      const result = parseTestOutput(testFile, output, duration);
      results.push(result);
      
      console.log(`    ✅ Passed: ${result.passed}, ❌ Failed: ${result.failed}, ⏭️  Skipped: ${result.skipped}`);
      console.log(`    ⏱️  Duration: ${result.duration}ms`);
      
    } catch (error: any) {
      const duration = Date.now();
      const result: TestResult = {
        testFile,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration,
        errors: [error.message || 'Unknown error']
      };
      
      results.push(result);
      console.log(`    ❌ Test file failed to run: ${error.message}`);
    }
  }

  return results;
}

function parseTestOutput(testFile: string, output: string, duration: number): TestResult {
  // Parse vitest output to extract test results
  const lines = output.split('\n');
  
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];
  
  // Look for test result patterns in vitest output
  for (const line of lines) {
    if (line.includes('✓') || line.includes('PASS')) {
      passed++;
    } else if (line.includes('✗') || line.includes('FAIL')) {
      failed++;
      errors.push(line.trim());
    } else if (line.includes('○') || line.includes('SKIP')) {
      skipped++;
    }
  }
  
  // If no specific test counts found, try to parse summary
  const summaryMatch = output.match(/(\d+) passed.*?(\d+) failed.*?(\d+) skipped/);
  if (summaryMatch) {
    passed = parseInt(summaryMatch[1]) || passed;
    failed = parseInt(summaryMatch[2]) || failed;
    skipped = parseInt(summaryMatch[3]) || skipped;
  }
  
  // Extract error messages
  const errorSections = output.split('FAIL').slice(1);
  for (const section of errorSections) {
    const errorLines = section.split('\n').slice(0, 3);
    errors.push(errorLines.join(' ').trim());
  }
  
  return {
    testFile,
    passed,
    failed,
    skipped,
    duration,
    errors: errors.slice(0, 5) // Limit to first 5 errors
  };
}

function generateTestReport(allResults: TestResult[]): string {
  const totalPassed = allResults.reduce((sum, result) => sum + result.passed, 0);
  const totalFailed = allResults.reduce((sum, result) => sum + result.failed, 0);
  const totalSkipped = allResults.reduce((sum, result) => sum + result.skipped, 0);
  const totalDuration = allResults.reduce((sum, result) => sum + result.duration, 0);
  const totalTests = totalPassed + totalFailed + totalSkipped;
  
  const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : '0';
  
  let report = `# Invitation Workflow Integration Test Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  
  report += `## Summary\n\n`;
  report += `- **Total Tests:** ${totalTests}\n`;
  report += `- **Passed:** ${totalPassed} ✅\n`;
  report += `- **Failed:** ${totalFailed} ❌\n`;
  report += `- **Skipped:** ${totalSkipped} ⏭️\n`;
  report += `- **Success Rate:** ${successRate}%\n`;
  report += `- **Total Duration:** ${totalDuration}ms\n\n`;
  
  report += `## Requirements Coverage\n\n`;
  report += `This test suite covers the following requirements from the invitation-form-approval-system-fix spec:\n\n`;
  
  const requirementDescriptions = {
    '1.1': 'Anonymous user form submission with audit logging',
    '1.2': 'Authenticated user form submission with proper context',
    '2.1': 'Admin invitation request management and approval/denial',
    '2.2': 'Admin operations with proper permissions and email notifications',
    '3.1': 'Database permission and RLS policy fixes for all user types',
    '3.2': 'Service role elevation and admin operation error handling',
    '3.3': 'Email event logging without RLS violations'
  };
  
  for (const [req, desc] of Object.entries(requirementDescriptions)) {
    report += `- **${req}:** ${desc}\n`;
  }
  
  report += `\n## Test Suite Results\n\n`;
  
  for (const suite of testSuites) {
    const suiteResults = allResults.filter(result => 
      suite.testFiles.some(file => result.testFile.includes(file))
    );
    
    const suitePassed = suiteResults.reduce((sum, result) => sum + result.passed, 0);
    const suiteFailed = suiteResults.reduce((sum, result) => sum + result.failed, 0);
    const suiteSkipped = suiteResults.reduce((sum, result) => sum + result.skipped, 0);
    const suiteDuration = suiteResults.reduce((sum, result) => sum + result.duration, 0);
    
    report += `### ${suite.name}\n\n`;
    report += `${suite.description}\n\n`;
    report += `- **Tests:** ${suitePassed + suiteFailed + suiteSkipped}\n`;
    report += `- **Passed:** ${suitePassed}\n`;
    report += `- **Failed:** ${suiteFailed}\n`;
    report += `- **Duration:** ${suiteDuration}ms\n\n`;
  }
  
  report += `## Detailed Results\n\n`;
  
  for (const result of allResults) {
    const status = result.failed > 0 ? '❌' : result.passed > 0 ? '✅' : '⏭️';
    report += `### ${status} ${result.testFile}\n\n`;
    report += `- **Passed:** ${result.passed}\n`;
    report += `- **Failed:** ${result.failed}\n`;
    report += `- **Skipped:** ${result.skipped}\n`;
    report += `- **Duration:** ${result.duration}ms\n`;
    
    if (result.errors.length > 0) {
      report += `\n**Errors:**\n`;
      for (const error of result.errors) {
        report += `- ${error}\n`;
      }
    }
    
    report += `\n`;
  }
  
  report += `## Test Coverage Analysis\n\n`;
  report += `### Functional Areas Tested\n\n`;
  report += `1. **Anonymous User Form Submission**\n`;
  report += `   - Form validation and submission\n`;
  report += `   - Authentication context handling\n`;
  report += `   - Audit logging for anonymous users\n`;
  report += `   - RLS policy compliance\n\n`;
  
  report += `2. **Authenticated User Form Submission**\n`;
  report += `   - User context preservation\n`;
  report += `   - Authentication state validation\n`;
  report += `   - Proper audit trail creation\n`;
  report += `   - Context switching error handling\n\n`;
  
  report += `3. **Admin Operations**\n`;
  report += `   - Permission validation\n`;
  report += `   - Invitation approval/denial workflow\n`;
  report += `   - Service role elevation\n`;
  report += `   - Concurrent operation handling\n`;
  report += `   - Admin action audit logging\n\n`;
  
  report += `4. **Email Notification System**\n`;
  report += `   - Confirmation email sending\n`;
  report += `   - Invitation email delivery\n`;
  report += `   - Email service error handling\n`;
  report += `   - Rate limiting and retry mechanisms\n`;
  report += `   - Email event logging without RLS violations\n\n`;
  
  report += `5. **Error Handling and Recovery**\n`;
  report += `   - RLS policy violation handling\n`;
  report += `   - Network connectivity issues\n`;
  report += `   - Service unavailability scenarios\n`;
  report += `   - Data validation edge cases\n`;
  report += `   - Retry mechanisms and fallback strategies\n\n`;
  
  report += `### Security and Permission Testing\n\n`;
  report += `- **Row Level Security (RLS) Policy Compliance**\n`;
  report += `- **Authentication Context Validation**\n`;
  report += `- **Admin Permission Boundary Testing**\n`;
  report += `- **Service Role Elevation Security**\n`;
  report += `- **JWT Token Expiration Handling**\n`;
  report += `- **Concurrent Operation Safety**\n\n`;
  
  if (totalFailed > 0) {
    report += `## ⚠️ Action Items\n\n`;
    report += `The following issues were identified and should be addressed:\n\n`;
    
    let actionItemCount = 1;
    for (const result of allResults) {
      if (result.failed > 0) {
        report += `${actionItemCount}. **${result.testFile}**\n`;
        for (const error of result.errors.slice(0, 3)) {
          report += `   - ${error}\n`;
        }
        report += `\n`;
        actionItemCount++;
      }
    }
  } else {
    report += `## ✅ All Tests Passed\n\n`;
    report += `Congratulations! All invitation workflow integration tests are passing. `;
    report += `The invitation system is functioning correctly across all tested scenarios.\n\n`;
  }
  
  report += `## Next Steps\n\n`;
  report += `1. **Review any failed tests** and address the underlying issues\n`;
  report += `2. **Run tests in different environments** (development, staging)\n`;
  report += `3. **Monitor production metrics** to validate real-world performance\n`;
  report += `4. **Update tests** as new features are added to the invitation system\n`;
  report += `5. **Schedule regular test runs** to catch regressions early\n\n`;
  
  report += `---\n`;
  report += `*This report was generated automatically by the invitation workflow test runner.*\n`;
  
  return report;
}

async function main() {
  console.log('🚀 Starting Invitation Workflow Integration Tests');
  console.log('=' .repeat(60));
  
  const allResults: TestResult[] = [];
  
  try {
    // Run all test suites
    for (const suite of testSuites) {
      const suiteResults = await runTestSuite(suite);
      allResults.push(...suiteResults);
    }
    
    // Generate and save report
    const report = generateTestReport(allResults);
    const reportPath = join(process.cwd(), 'invitation-workflow-test-report.md');
    writeFileSync(reportPath, report);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Execution Complete');
    console.log(`📄 Report saved to: ${reportPath}`);
    
    const totalTests = allResults.reduce((sum, result) => sum + result.passed + result.failed + result.skipped, 0);
    const totalPassed = allResults.reduce((sum, result) => sum + result.passed, 0);
    const totalFailed = allResults.reduce((sum, result) => sum + result.failed, 0);
    
    console.log(`📈 Summary: ${totalPassed}/${totalTests} tests passed`);
    
    if (totalFailed > 0) {
      console.log(`❌ ${totalFailed} tests failed - see report for details`);
      process.exit(1);
    } else {
      console.log('✅ All tests passed successfully!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
export { runTestSuite, generateTestReport, testSuites };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}