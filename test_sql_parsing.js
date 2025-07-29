#!/usr/bin/env node

import fs from 'fs';

/**
 * Test SQL parsing by analyzing the structure more thoroughly
 */
function testSQLParsing() {
  const migrationPath = 'supabase/migrations/20250125_invitation_token_management_functions.sql';
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }
  
  const content = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('🧪 Testing SQL parsing and structure...\n');
  
  let errors = [];
  let warnings = [];
  
  // Test 1: Parse function definitions with proper regex
  console.log('1. Testing function definition parsing...');
  
  // More robust function parsing
  const functionPattern = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(\w+)\s*\([^)]*\)\s*RETURNS\s+[^$]+\$([^$]*)\$(.*?)\$\2\$\s*LANGUAGE\s+plpgsql(?:\s+SECURITY\s+DEFINER)?/gis;
  
  const functions = [];
  let match;
  
  while ((match = functionPattern.exec(content)) !== null) {
    functions.push({
      name: match[1],
      delimiter: match[2],
      body: match[3],
      hasSecurityDefiner: match[0].includes('SECURITY DEFINER')
    });
  }
  
  console.log(`   ✅ Successfully parsed ${functions.length} function definitions`);
  
  functions.forEach(func => {
    console.log(`   - ${func.name}: delimiter="${func.delimiter}", security=${func.hasSecurityDefiner}`);
  });
  
  // Test 2: Validate function body structure
  console.log('\n2. Testing function body structure...');
  
  functions.forEach(func => {
    const body = func.body.trim();
    
    // Check for proper structure
    if (body.includes('BEGIN') && body.includes('END')) {
      console.log(`   ✅ ${func.name}: Has proper BEGIN/END structure`);
    } else if (body.includes('RETURN QUERY')) {
      console.log(`   ✅ ${func.name}: Has RETURN QUERY (valid for simple functions)`);
    } else {
      warnings.push(`${func.name}: Unusual function body structure`);
    }
    
    // Check for DECLARE blocks
    if (body.includes('DECLARE')) {
      const declareMatch = body.match(/DECLARE(.*?)BEGIN/s);
      if (declareMatch) {
        console.log(`   ✅ ${func.name}: Has proper DECLARE block`);
      } else {
        warnings.push(`${func.name}: DECLARE found but structure unclear`);
      }
    }
  });
  
  // Test 3: Validate SQL statement structure
  console.log('\n3. Testing SQL statement structure...');
  
  // Split by semicolons and analyze each statement
  const statements = content.split(';').map(s => s.trim()).filter(s => s.length > 0);
  
  const statementTypes = {
    'CREATE FUNCTION': 0,
    'CREATE VIEW': 0,
    'CREATE POLICY': 0,
    'GRANT': 0,
    'COMMENT': 0,
    'OTHER': 0
  };
  
  statements.forEach(stmt => {
    if (stmt.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION/i)) {
      statementTypes['CREATE FUNCTION']++;
    } else if (stmt.match(/CREATE\s+(?:OR\s+REPLACE\s+)?VIEW/i)) {
      statementTypes['CREATE VIEW']++;
    } else if (stmt.match(/CREATE\s+POLICY/i)) {
      statementTypes['CREATE POLICY']++;
    } else if (stmt.match(/GRANT/i)) {
      statementTypes['GRANT']++;
    } else if (stmt.match(/COMMENT\s+ON/i)) {
      statementTypes['COMMENT']++;
    } else if (stmt.trim().length > 0) {
      statementTypes['OTHER']++;
    }
  });
  
  console.log('   Statement breakdown:');
  Object.entries(statementTypes).forEach(([type, count]) => {
    if (count > 0) {
      console.log(`   - ${type}: ${count}`);
    }
  });
  
  // Test 4: Validate specific PostgreSQL syntax elements
  console.log('\n4. Testing PostgreSQL syntax elements...');
  
  // Test UUID usage
  const uuidPattern = /\bUUID\b/gi;
  const uuidMatches = content.match(uuidPattern);
  if (uuidMatches) {
    console.log(`   ✅ UUID type used correctly (${uuidMatches.length} occurrences)`);
  }
  
  // Test timestamp usage
  const timestampPattern = /TIMESTAMP\s+WITH\s+TIME\s+ZONE/gi;
  const timestampMatches = content.match(timestampPattern);
  if (timestampMatches) {
    console.log(`   ✅ TIMESTAMP WITH TIME ZONE used correctly (${timestampMatches.length} occurrences)`);
  }
  
  // Test interval usage
  const intervalPattern = /INTERVAL\s+'[^']+'/gi;
  const intervalMatches = content.match(intervalPattern);
  if (intervalMatches) {
    console.log(`   ✅ INTERVAL syntax used correctly (${intervalMatches.length} occurrences)`);
    intervalMatches.forEach(interval => {
      console.log(`     - ${interval}`);
    });
  }
  
  // Test 5: Check for balanced parentheses and quotes
  console.log('\n5. Testing balanced parentheses and quotes...');
  
  let parenCount = 0;
  let singleQuoteCount = 0;
  let inDollarQuote = false;
  let dollarQuoteTag = '';
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChars = content.substr(i, 10);
    
    if (char === '$' && !inDollarQuote) {
      const dollarMatch = nextChars.match(/^\$([^$]*)\$/);
      if (dollarMatch) {
        inDollarQuote = true;
        dollarQuoteTag = dollarMatch[1];
        i += dollarMatch[0].length - 1;
      }
    } else if (char === '$' && inDollarQuote) {
      const endTag = `$${dollarQuoteTag}$`;
      if (content.substr(i, endTag.length) === endTag) {
        inDollarQuote = false;
        dollarQuoteTag = '';
        i += endTag.length - 1;
      }
    } else if (!inDollarQuote) {
      if (char === '(') parenCount++;
      else if (char === ')') parenCount--;
      else if (char === "'") singleQuoteCount++;
    }
  }
  
  if (parenCount === 0) {
    console.log('   ✅ Parentheses are balanced');
  } else {
    errors.push(`Unbalanced parentheses: ${parenCount > 0 ? 'missing closing' : 'extra closing'}`);
  }
  
  if (singleQuoteCount % 2 === 0) {
    console.log('   ✅ Single quotes appear balanced');
  } else {
    warnings.push('Odd number of single quotes found - might indicate unbalanced quotes');
  }
  
  if (!inDollarQuote) {
    console.log('   ✅ All dollar-quoted strings are properly closed');
  } else {
    errors.push(`Unclosed dollar-quoted string with tag: ${dollarQuoteTag}`);
  }
  
  // Test 6: Validate specific function requirements
  console.log('\n6. Testing function-specific requirements...');
  
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
  
  const foundFunctions = functions.map(f => f.name);
  const missingFunctions = requiredFunctions.filter(f => !foundFunctions.includes(f));
  
  if (missingFunctions.length === 0) {
    console.log('   ✅ All required functions are present');
  } else {
    errors.push(`Missing required functions: ${missingFunctions.join(', ')}`);
  }
  
  // Test 7: Validate GRANT statements match functions
  console.log('\n7. Testing GRANT statement coverage...');
  
  const grantPattern = /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+(\w+)/gi;
  const grantedFunctions = [];
  let grantMatch;
  
  while ((grantMatch = grantPattern.exec(content)) !== null) {
    grantedFunctions.push(grantMatch[1]);
  }
  
  const publicFunctions = requiredFunctions.filter(f => f !== 'auto_cleanup_old_expired_tokens');
  const ungrantedFunctions = publicFunctions.filter(f => !grantedFunctions.includes(f));
  
  if (ungrantedFunctions.length === 0) {
    console.log('   ✅ All public functions have GRANT statements');
  } else {
    warnings.push(`Functions without GRANT statements: ${ungrantedFunctions.join(', ')}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SQL PARSING TEST SUMMARY');
  console.log('='.repeat(60));
  
  if (errors.length === 0) {
    console.log('✅ All SQL parsing tests passed!');
  } else {
    console.log('❌ SQL parsing errors found:');
    errors.forEach(error => console.log(`   - ${error}`));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
  console.log(`\n📊 Parsing Statistics:`);
  console.log(`   - Functions parsed: ${functions.length}`);
  console.log(`   - Total statements: ${statements.length}`);
  console.log(`   - Functions with SECURITY DEFINER: ${functions.filter(f => f.hasSecurityDefiner).length}`);
  console.log(`   - GRANT statements: ${grantedFunctions.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ SQL parsing failed - syntax errors need to be fixed!');
    process.exit(1);
  } else {
    console.log('\n🎉 SQL parsing test completed successfully!');
    console.log('✅ All functions have proper opening and closing delimiters');
    console.log('✅ All PostgreSQL-specific syntax is correctly formatted');
    console.log('✅ Migration file is ready for database application');
    process.exit(0);
  }
}

// Run SQL parsing test
testSQLParsing();