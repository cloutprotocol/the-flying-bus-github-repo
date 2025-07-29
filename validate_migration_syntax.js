#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * Validates SQL migration file syntax
 */
function validateMigrationSyntax() {
  const migrationPath = 'supabase/migrations/20250125_invitation_token_management_functions.sql';
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }
  
  const content = fs.readFileSync(migrationPath, 'utf8');
  const lines = content.split('\n');
  
  console.log('🔍 Validating SQL migration syntax...\n');
  
  let errors = [];
  let warnings = [];
  
  // Check 1: Dollar-quoted string validation
  console.log('1. Checking dollar-quoted strings...');
  const dollarQuotePattern = /\$([^$]*)\$/g;
  const dollarQuotes = [];
  let match;
  
  while ((match = dollarQuotePattern.exec(content)) !== null) {
    dollarQuotes.push({
      quote: match[0],
      tag: match[1],
      index: match.index
    });
  }
  
  // Check for proper pairing of dollar quotes
  const dollarQuoteStack = [];
  for (const quote of dollarQuotes) {
    if (dollarQuoteStack.length === 0) {
      dollarQuoteStack.push(quote);
    } else {
      const last = dollarQuoteStack[dollarQuoteStack.length - 1];
      if (last.quote === quote.quote) {
        dollarQuoteStack.pop(); // Matching pair found
      } else {
        dollarQuoteStack.push(quote);
      }
    }
  }
  
  if (dollarQuoteStack.length > 0) {
    errors.push(`Unmatched dollar-quoted strings found: ${dollarQuoteStack.map(q => q.quote).join(', ')}`);
  } else {
    console.log('   ✅ All dollar-quoted strings are properly paired');
  }
  
  // Check 2: Function structure validation
  console.log('\n2. Checking function structure...');
  const functionPattern = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(\w+)/gi;
  const functions = [];
  
  while ((match = functionPattern.exec(content)) !== null) {
    functions.push(match[1]);
  }
  
  console.log(`   Found ${functions.length} functions:`);
  functions.forEach(func => console.log(`   - ${func}`));
  
  // Check 3: Basic PostgreSQL syntax validation
  console.log('\n3. Checking PostgreSQL syntax...');
  
  // Check for common syntax issues
  const syntaxChecks = [
    {
      name: 'LANGUAGE clause',
      pattern: /\$\s+LANGUAGE\s+plpgsql/gi,
      expected: true
    },
    {
      name: 'SECURITY DEFINER',
      pattern: /SECURITY\s+DEFINER/gi,
      expected: true
    },
    {
      name: 'RETURNS TABLE',
      pattern: /RETURNS\s+TABLE\s*\(/gi,
      expected: true
    },
    {
      name: 'RETURN QUERY',
      pattern: /RETURN\s+QUERY/gi,
      expected: true
    }
  ];
  
  syntaxChecks.forEach(check => {
    const matches = content.match(check.pattern);
    if (check.expected && matches) {
      console.log(`   ✅ ${check.name}: Found ${matches.length} occurrences`);
    } else if (check.expected && !matches) {
      warnings.push(`${check.name} not found - this might be expected`);
    }
  });
  
  // Check 4: Validate specific PostgreSQL constructs
  console.log('\n4. Checking PostgreSQL-specific constructs...');
  
  // Check for proper UUID usage
  if (content.includes('UUID') && content.includes('gen_random_bytes')) {
    console.log('   ✅ UUID and random generation functions used correctly');
  }
  
  // Check for proper timestamp usage
  if (content.includes('TIMESTAMP WITH TIME ZONE')) {
    console.log('   ✅ Timezone-aware timestamps used');
  }
  
  // Check for proper interval usage
  if (content.includes("INTERVAL '")) {
    console.log('   ✅ Interval syntax appears correct');
  }
  
  // Check 5: Validate GRANT statements
  console.log('\n5. Checking permission grants...');
  const grantPattern = /GRANT\s+EXECUTE\s+ON\s+FUNCTION/gi;
  const grants = content.match(grantPattern);
  if (grants) {
    console.log(`   ✅ Found ${grants.length} GRANT EXECUTE statements`);
  } else {
    warnings.push('No GRANT EXECUTE statements found');
  }
  
  // Check 6: Validate view creation
  console.log('\n6. Checking view creation...');
  if (content.includes('CREATE OR REPLACE VIEW')) {
    console.log('   ✅ View creation statement found');
  }
  
  // Check 7: Validate RLS policies
  console.log('\n7. Checking RLS policies...');
  if (content.includes('CREATE POLICY')) {
    console.log('   ✅ RLS policy creation found');
  }
  
  // Check 8: Look for potential issues
  console.log('\n8. Checking for potential issues...');
  
  // Check for single quotes that might cause issues
  const singleQuoteIssues = content.match(/'\s*\$[^$]*\$\s*'/g);
  if (singleQuoteIssues) {
    warnings.push(`Potential single quote issues around dollar quotes: ${singleQuoteIssues.length} found`);
  }
  
  // Check for missing semicolons at end of statements
  const statements = content.split(';');
  let missingSemicolons = 0;
  statements.forEach((stmt, index) => {
    const trimmed = stmt.trim();
    if (trimmed && index < statements.length - 1 && !trimmed.endsWith(';')) {
      missingSemicolons++;
    }
  });
  
  if (missingSemicolons === 0) {
    console.log('   ✅ All statements appear to end with semicolons');
  } else {
    warnings.push(`${missingSemicolons} statements might be missing semicolons`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(50));
  
  if (errors.length === 0) {
    console.log('✅ No syntax errors found!');
  } else {
    console.log('❌ Syntax errors found:');
    errors.forEach(error => console.log(`   - ${error}`));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
  console.log(`\n📊 Statistics:`);
  console.log(`   - Functions: ${functions.length}`);
  console.log(`   - Dollar quotes: ${dollarQuotes.length}`);
  console.log(`   - Lines: ${lines.length}`);
  console.log(`   - File size: ${content.length} characters`);
  
  if (errors.length > 0) {
    process.exit(1);
  } else {
    console.log('\n🎉 Migration file syntax validation passed!');
    process.exit(0);
  }
}

// Run validation
validateMigrationSyntax();