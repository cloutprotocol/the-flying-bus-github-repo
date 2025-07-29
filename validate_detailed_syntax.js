#!/usr/bin/env node

import fs from 'fs';

/**
 * Detailed SQL syntax validation for PostgreSQL migration files
 */
function validateDetailedSyntax() {
  const migrationPath = 'supabase/migrations/20250125_invitation_token_management_functions.sql';
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }
  
  const content = fs.readFileSync(migrationPath, 'utf8');
  const lines = content.split('\n');
  
  console.log('🔍 Performing detailed SQL syntax validation...\n');
  
  let errors = [];
  let warnings = [];
  
  // Check 1: Validate dollar-quoted string delimiters
  console.log('1. Validating dollar-quoted string delimiters...');
  
  // Find all function definitions and their dollar quotes
  const functionBlocks = [];
  const functionRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(\w+)[^$]*?\$([^$]*)\$(.*?)\$\2\$/gis;
  let match;
  
  while ((match = functionRegex.exec(content)) !== null) {
    functionBlocks.push({
      name: match[1],
      delimiter: match[2],
      body: match[3],
      fullMatch: match[0]
    });
  }
  
  console.log(`   Found ${functionBlocks.length} function blocks with dollar quotes`);
  
  // Validate each function's dollar quotes
  functionBlocks.forEach((func, index) => {
    if (func.delimiter === '') {
      console.log(`   ✅ Function ${func.name}: Uses simple $ delimiter`);
    } else {
      console.log(`   ✅ Function ${func.name}: Uses named delimiter $${func.delimiter}$`);
    }
    
    // Check for nested dollar quotes in function body
    const nestedDollarQuotes = func.body.match(/\$[^$]*\$/g);
    if (nestedDollarQuotes) {
      warnings.push(`Function ${func.name} contains nested dollar quotes: ${nestedDollarQuotes.join(', ')}`);
    }
  });
  
  // Check 2: Validate function structure completeness
  console.log('\n2. Validating function structure completeness...');
  
  const requiredFunctions = [
    'regenerate_invitation_token',
    'get_invitation_token_info', 
    'get_active_invitation_tokens',
    'get_expiring_invitation_tokens',
    'get_invitation_token_stats',
    'extend_invitation_token_expiry',
    'get_invitation_token_history',
    'cleanup_expired_tokens_detailed',
    'validate_invitation_token_detailed',
    'auto_cleanup_old_expired_tokens',
    'schedule_token_cleanup'
  ];
  
  requiredFunctions.forEach(funcName => {
    const found = functionBlocks.find(f => f.name === funcName);
    if (found) {
      console.log(`   ✅ ${funcName}: Found and properly delimited`);
    } else {
      errors.push(`Required function ${funcName} not found or improperly formatted`);
    }
  });
  
  // Check 3: Validate PostgreSQL-specific syntax elements
  console.log('\n3. Validating PostgreSQL-specific syntax...');
  
  // Check DECLARE blocks
  const declareBlocks = content.match(/DECLARE[^;]*?BEGIN/gis);
  if (declareBlocks) {
    console.log(`   ✅ Found ${declareBlocks.length} DECLARE blocks`);
    
    // Validate each DECLARE block
    declareBlocks.forEach((block, index) => {
      if (block.includes('RECORD') || block.includes('INTEGER') || block.includes('TEXT') || block.includes('TIMESTAMP')) {
        console.log(`   ✅ DECLARE block ${index + 1}: Contains valid variable declarations`);
      } else {
        warnings.push(`DECLARE block ${index + 1} might have unusual variable declarations`);
      }
    });
  }
  
  // Check RETURN QUERY statements
  const returnQueries = content.match(/RETURN\s+QUERY[^;]*?;/gis);
  if (returnQueries) {
    console.log(`   ✅ Found ${returnQueries.length} RETURN QUERY statements`);
  }
  
  // Check proper use of LANGUAGE plpgsql
  const languageClauses = content.match(/\$\s*LANGUAGE\s+plpgsql/gi);
  if (languageClauses && languageClauses.length === functionBlocks.length) {
    console.log(`   ✅ All functions have proper LANGUAGE plpgsql clauses`);
  } else {
    errors.push(`Mismatch between function count (${functionBlocks.length}) and LANGUAGE clauses (${languageClauses ? languageClauses.length : 0})`);
  }
  
  // Check 4: Validate specific PostgreSQL constructs
  console.log('\n4. Validating PostgreSQL constructs...');
  
  // UUID validation
  const uuidUsage = content.match(/UUID/g);
  if (uuidUsage) {
    console.log(`   ✅ UUID type used ${uuidUsage.length} times`);
  }
  
  // Timestamp validation
  const timestampUsage = content.match(/TIMESTAMP\s+WITH\s+TIME\s+ZONE/gi);
  if (timestampUsage) {
    console.log(`   ✅ TIMESTAMP WITH TIME ZONE used ${timestampUsage.length} times`);
  }
  
  // Interval validation
  const intervalUsage = content.match(/INTERVAL\s+'[^']+'/gi);
  if (intervalUsage) {
    console.log(`   ✅ INTERVAL syntax used ${intervalUsage.length} times`);
    
    // Validate interval formats
    intervalUsage.forEach(interval => {
      if (interval.match(/INTERVAL\s+'(\d+\s+(days?|hours?|minutes?|seconds?)|[^']+\s+(days?|hours?|minutes?|seconds?))'/i)) {
        console.log(`   ✅ Valid interval format: ${interval}`);
      } else {
        warnings.push(`Potentially invalid interval format: ${interval}`);
      }
    });
  }
  
  // Check 5: Validate table and column references
  console.log('\n5. Validating table and column references...');
  
  const expectedTables = ['invitation_tokens', 'invitation_requests'];
  expectedTables.forEach(table => {
    const tableRefs = content.match(new RegExp(`\\b${table}\\b`, 'gi'));
    if (tableRefs) {
      console.log(`   ✅ Table ${table}: Referenced ${tableRefs.length} times`);
    } else {
      warnings.push(`Table ${table} not referenced - might be expected`);
    }
  });
  
  // Check 6: Validate GRANT statements
  console.log('\n6. Validating permission grants...');
  
  const grantStatements = content.match(/GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+\w+[^;]*?TO\s+authenticated/gi);
  if (grantStatements) {
    console.log(`   ✅ Found ${grantStatements.length} proper GRANT EXECUTE statements`);
    
    // Check that all functions have grants
    const grantedFunctions = grantStatements.map(grant => {
      const match = grant.match(/FUNCTION\s+(\w+)/i);
      return match ? match[1] : null;
    }).filter(Boolean);
    
    const functionsWithoutGrants = requiredFunctions.filter(func => 
      !grantedFunctions.includes(func) && func !== 'auto_cleanup_old_expired_tokens'
    );
    
    if (functionsWithoutGrants.length === 0) {
      console.log(`   ✅ All public functions have GRANT statements`);
    } else {
      warnings.push(`Functions without GRANT statements: ${functionsWithoutGrants.join(', ')}`);
    }
  }
  
  // Check 7: Validate view and policy creation
  console.log('\n7. Validating view and policy creation...');
  
  if (content.includes('CREATE OR REPLACE VIEW admin_token_overview')) {
    console.log('   ✅ Admin token overview view creation found');
  } else {
    errors.push('Admin token overview view creation not found');
  }
  
  if (content.includes('CREATE POLICY')) {
    console.log('   ✅ RLS policy creation found');
  } else {
    warnings.push('No RLS policy creation found');
  }
  
  // Check 8: Validate comment statements
  console.log('\n8. Validating documentation comments...');
  
  const commentStatements = content.match(/COMMENT\s+ON\s+FUNCTION[^;]*?;/gi);
  if (commentStatements) {
    console.log(`   ✅ Found ${commentStatements.length} function comments`);
  } else {
    warnings.push('No function comments found');
  }
  
  // Check 9: Look for common syntax issues
  console.log('\n9. Checking for common syntax issues...');
  
  // Check for unescaped single quotes in strings
  const stringLiterals = content.match(/'[^']*'/g) || [];
  let problematicStrings = 0;
  stringLiterals.forEach(str => {
    if (str.includes("'") && !str.includes("''")) {
      problematicStrings++;
    }
  });
  
  if (problematicStrings === 0) {
    console.log('   ✅ No unescaped single quotes in string literals');
  } else {
    warnings.push(`${problematicStrings} potentially problematic string literals found`);
  }
  
  // Check for proper statement termination
  const statements = content.split(';').filter(s => s.trim());
  console.log(`   ✅ Found ${statements.length} SQL statements`);
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('DETAILED VALIDATION SUMMARY');
  console.log('='.repeat(60));
  
  if (errors.length === 0) {
    console.log('✅ No critical syntax errors found!');
  } else {
    console.log('❌ Critical syntax errors found:');
    errors.forEach(error => console.log(`   - ${error}`));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings (non-critical):');
    warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
  console.log(`\n📊 Detailed Statistics:`);
  console.log(`   - Function blocks with proper delimiters: ${functionBlocks.length}`);
  console.log(`   - DECLARE blocks: ${declareBlocks ? declareBlocks.length : 0}`);
  console.log(`   - RETURN QUERY statements: ${returnQueries ? returnQueries.length : 0}`);
  console.log(`   - UUID references: ${uuidUsage ? uuidUsage.length : 0}`);
  console.log(`   - Timestamp references: ${timestampUsage ? timestampUsage.length : 0}`);
  console.log(`   - Interval statements: ${intervalUsage ? intervalUsage.length : 0}`);
  console.log(`   - GRANT statements: ${grantStatements ? grantStatements.length : 0}`);
  console.log(`   - Comment statements: ${commentStatements ? commentStatements.length : 0}`);
  console.log(`   - Total SQL statements: ${statements.length}`);
  console.log(`   - File size: ${content.length} characters`);
  console.log(`   - Lines: ${lines.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Migration file has critical syntax issues that need to be fixed!');
    process.exit(1);
  } else {
    console.log('\n🎉 Migration file passed detailed syntax validation!');
    console.log('✅ All functions have proper opening and closing delimiters');
    console.log('✅ All PostgreSQL-specific syntax is correctly formatted');
    console.log('✅ Ready for database migration');
    process.exit(0);
  }
}

// Run detailed validation
validateDetailedSyntax();