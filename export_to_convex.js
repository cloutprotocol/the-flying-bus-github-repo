/**
 * Export Supabase data to JSON format for Convex migration
 * This script exports all tables from the public schema
 */

const SUPABASE_URL = 'https://sutvexycbiiarpkugzpv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1dHZleHljYmlpYXJwa3VnenB2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTcwNTgyMCwiZXhwIjoyMDcxMjgxODIwfQ.wFRgRC_q6XvAXk-tjN5gGTmxQceW053-jrJHtT0TRcM';

const fs = require('fs');
const path = require('path');

// All public schema tables that contain app data
const TABLES = [
  'achievement_types',
  'activities',
  'article_reviews',
  'article_revisions',
  'article_tags',
  'article_views',
  'article_votes',
  'articles',
  'audit_logs',
  'categories',
  'comment_likes',
  'comments',
  'debate_articles',
  'email_events',
  'email_metrics',
  'flagged_content',
  'invitation_requests',
  'invitation_tokens',
  'media_assets',
  'performance_logs',
  'privacy_settings',
  'profiles',
  'rate_limit_attempts',
  'rate_limits',
  'registration_contexts',
  'storyboard_episodes',
  'storyboard_series',
  'system_configuration',
  'tags',
  'user_achievements',
  'user_reading_stats',
  'video_articles'
];

async function fetchTableData(tableName) {
  const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=*`;

  try {
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✓ Exported ${tableName}: ${data.length} records`);
    return data;
  } catch (error) {
    console.error(`✗ Error exporting ${tableName}:`, error.message);
    return [];
  }
}

async function exportAllTables() {
  console.log('Starting Supabase to Convex data export...\n');

  // Create export directory
  const exportDir = path.join(__dirname, 'convex_export');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
  }

  const allData = {};

  // Export each table
  for (const table of TABLES) {
    const data = await fetchTableData(table);
    allData[table] = data;

    // Write individual JSON file for each table
    const filePath = path.join(exportDir, `${table}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  // Write combined file
  const combinedPath = path.join(exportDir, '_all_tables.json');
  fs.writeFileSync(combinedPath, JSON.stringify(allData, null, 2));

  // Generate migration summary
  const summary = {
    exportDate: new Date().toISOString(),
    totalTables: TABLES.length,
    tableSummary: TABLES.map(table => ({
      table,
      recordCount: allData[table].length
    })),
    totalRecords: Object.values(allData).reduce((sum, records) => sum + records.length, 0)
  };

  const summaryPath = path.join(exportDir, '_export_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log('\n=== Export Complete ===');
  console.log(`Total tables: ${summary.totalTables}`);
  console.log(`Total records: ${summary.totalRecords}`);
  console.log(`Export location: ${exportDir}`);
  console.log('\nFiles created:');
  console.log(`  - Individual JSON files for each table`);
  console.log(`  - _all_tables.json (combined data)`);
  console.log(`  - _export_summary.json (migration summary)`);
}

// Run export
exportAllTables().catch(console.error);
