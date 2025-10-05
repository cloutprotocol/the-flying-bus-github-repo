#!/usr/bin/env node

/**
 * Simple test to check the current state of articles and submission flow
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCurrentState() {
  console.log('🔍 Checking Current Article Submission State');
  console.log('============================================');

  try {
    // Check all article statuses
    console.log('\n1️⃣ Checking all article statuses...');
    
    const { data: statusCounts, error: statusError } = await supabase
      .from('articles')
      .select('status')
      .then(result => {
        if (result.error) return result;
        
        const counts = {};
        result.data.forEach(article => {
          counts[article.status] = (counts[article.status] || 0) + 1;
        });
        
        return { data: counts, error: null };
      });

    if (statusError) {
      console.error('❌ Error fetching article statuses:', statusError);
      return;
    }

    console.log('📊 Article status distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    // Check for articles in pending states
    console.log('\n2️⃣ Checking articles in pending states...');
    
    const { data: pendingArticles, error: pendingError } = await supabase
      .from('articles')
      .select(`
        id,
        title,
        status,
        author_id,
        created_at,
        updated_at,
        submitted_for_review_at
      `)
      .in('status', ['pending', 'pending_review'])
      .order('updated_at', { ascending: false });

    if (pendingError) {
      console.error('❌ Error fetching pending articles:', pendingError);
      return;
    }

    console.log(`📋 Articles in pending states: ${pendingArticles.length}`);
    
    if (pendingArticles.length > 0) {
      console.log('\n📝 Pending articles:');
      pendingArticles.forEach((article, index) => {
        console.log(`   ${index + 1}. ${article.title}`);
        console.log(`      Status: ${article.status}`);
        console.log(`      ID: ${article.id}`);
        console.log(`      Updated: ${article.updated_at}`);
        console.log(`      Submitted for review: ${article.submitted_for_review_at || 'Not set'}`);
        console.log('');
      });
    } else {
      console.log('ℹ️  No articles currently in pending states');
    }

    // Check the database function exists
    console.log('\n3️⃣ Checking database functions...');
    
    const { data: functions, error: funcError } = await supabase
      .rpc('submit_article_with_validation', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_article_data: { test: true },
        p_save_draft: false
      })
      .then(result => ({ data: 'Function exists', error: null }))
      .catch(error => ({ data: null, error: error.message }));

    if (funcError) {
      if (funcError.includes('does not exist')) {
        console.log('❌ submit_article_with_validation function does not exist');
      } else {
        console.log('✅ submit_article_with_validation function exists (got expected error for test call)');
      }
    } else {
      console.log('✅ submit_article_with_validation function exists');
    }

    // Check what the admin approval queue would see
    console.log('\n4️⃣ Simulating admin approval queue query...');
    
    const { data: adminQueueArticles, error: adminError } = await supabase
      .from('articles')
      .select(`
        id,
        title,
        status,
        created_at,
        updated_at,
        categories (
          id,
          name
        ),
        profiles!author_id (
          id,
          display_name
        )
      `)
      .in('status', ['pending', 'pending_review'])
      .order('updated_at', { ascending: false });

    if (adminError) {
      console.error('❌ Error simulating admin queue:', adminError);
      return;
    }

    console.log(`📋 Admin queue would show: ${adminQueueArticles.length} articles`);

    // Check recent articles to see submission pattern
    console.log('\n5️⃣ Checking recent article activity...');
    
    const { data: recentArticles, error: recentError } = await supabase
      .from('articles')
      .select('id, title, status, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (recentError) {
      console.error('❌ Error fetching recent articles:', recentError);
      return;
    }

    console.log('📰 Recent articles:');
    recentArticles.forEach((article, index) => {
      console.log(`   ${index + 1}. ${article.title} (${article.status})`);
      console.log(`      Updated: ${article.updated_at}`);
    });

    // Summary
    console.log('\n📋 SUMMARY');
    console.log('==========');
    
    const hasPendingArticles = pendingArticles.length > 0;
    const totalArticles = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    
    console.log(`Total articles: ${totalArticles}`);
    console.log(`Articles in pending states: ${pendingArticles.length}`);
    
    if (!hasPendingArticles) {
      console.log('\n🔍 ISSUE IDENTIFIED:');
      console.log('   - No articles are currently in "pending" or "pending_review" status');
      console.log('   - This suggests that articles are either:');
      console.log('     a) Not being submitted for review properly, OR');
      console.log('     b) Being automatically processed/approved immediately');
      console.log('');
      console.log('💡 NEXT STEPS:');
      console.log('   1. Check if the submit_article_with_validation function is setting the correct status');
      console.log('   2. Verify that the admin approval workflow is not auto-approving articles');
      console.log('   3. Test the submission flow with a real user session');
    } else {
      console.log('\n✅ Articles are properly staying in pending state for review');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the check
checkCurrentState()
  .then(() => {
    console.log('\n🏁 Check completed');
  })
  .catch((error) => {
    console.error('💥 Check failed:', error);
    process.exit(1);
  });