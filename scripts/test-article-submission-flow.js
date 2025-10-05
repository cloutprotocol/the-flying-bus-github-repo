#!/usr/bin/env node

/**
 * Test script to reproduce the article submission issue
 * This script will:
 * 1. Create a draft article
 * 2. Submit it for review
 * 3. Check if it appears in the admin approval queue
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testArticleSubmissionFlow() {
  console.log('🧪 Testing Article Submission Flow');
  console.log('=====================================');

  try {
    // Step 1: Check if we have a test user
    console.log('\n1️⃣ Checking authentication...');
    
    // For this test, we'll use the existing user ID from the database
    const testUserId = '98d4b2c9-37f6-46e4-8508-12e7cf99ff10';
    console.log(`Using test user ID: ${testUserId}`);

    // Step 2: Get a category ID
    console.log('\n2️⃣ Getting category information...');
    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('id, name')
      .limit(1);

    if (categoryError) {
      console.error('❌ Error fetching categories:', categoryError);
      return;
    }

    if (!categories || categories.length === 0) {
      console.error('❌ No categories found');
      return;
    }

    const categoryId = categories[0].id;
    console.log(`✅ Using category: ${categories[0].name} (${categoryId})`);

    // Step 3: Create a test article draft
    console.log('\n3️⃣ Creating test article draft...');
    
    const testArticleData = {
      title: `Test Article Submission ${new Date().toISOString()}`,
      content: '<p>This is a test article to verify the submission flow works correctly.</p>',
      excerpt: 'Test article for submission flow verification',
      author_id: testUserId,
      category_id: categoryId,
      status: 'draft',
      article_type: 'standard',
      slug: `test-article-${Date.now()}`
    };

    const { data: draftArticle, error: draftError } = await supabase
      .from('articles')
      .insert(testArticleData)
      .select()
      .single();

    if (draftError) {
      console.error('❌ Error creating draft article:', draftError);
      return;
    }

    console.log(`✅ Draft article created: ${draftArticle.id}`);
    console.log(`   Title: ${draftArticle.title}`);
    console.log(`   Status: ${draftArticle.status}`);

    // Step 4: Submit the article for review using the database function
    console.log('\n4️⃣ Submitting article for review...');
    
    const { data: submissionResult, error: submissionError } = await supabase
      .rpc('submit_article_with_validation', {
        p_user_id: testUserId,
        p_article_data: {
          id: draftArticle.id,
          title: draftArticle.title,
          content: draftArticle.content,
          excerpt: draftArticle.excerpt,
          categoryId: categoryId,
          articleType: 'standard',
          slug: draftArticle.slug
        },
        p_save_draft: false
      });

    if (submissionError) {
      console.error('❌ Error submitting article:', submissionError);
      return;
    }

    console.log('📤 Submission result:', submissionResult);

    // Step 5: Check the article status after submission
    console.log('\n5️⃣ Checking article status after submission...');
    
    const { data: updatedArticle, error: fetchError } = await supabase
      .from('articles')
      .select('id, title, status, updated_at')
      .eq('id', draftArticle.id)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching updated article:', fetchError);
      return;
    }

    console.log(`✅ Article status after submission: ${updatedArticle.status}`);
    console.log(`   Updated at: ${updatedArticle.updated_at}`);

    // Step 6: Check if article appears in admin approval queue
    console.log('\n6️⃣ Checking admin approval queue...');
    
    const { data: pendingArticles, error: queueError } = await supabase
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

    if (queueError) {
      console.error('❌ Error fetching approval queue:', queueError);
      return;
    }

    console.log(`📋 Articles in approval queue: ${pendingArticles.length}`);
    
    if (pendingArticles.length > 0) {
      console.log('\n📝 Articles pending review:');
      pendingArticles.forEach((article, index) => {
        console.log(`   ${index + 1}. ${article.title} (${article.status}) - ${article.id}`);
      });
    } else {
      console.log('⚠️  No articles found in approval queue');
    }

    // Step 7: Check if our test article is in the queue
    const ourArticleInQueue = pendingArticles.find(article => article.id === draftArticle.id);
    
    if (ourArticleInQueue) {
      console.log(`✅ SUCCESS: Test article found in approval queue with status: ${ourArticleInQueue.status}`);
    } else {
      console.log(`❌ ISSUE: Test article NOT found in approval queue`);
      console.log(`   Current status: ${updatedArticle.status}`);
      console.log(`   Expected status: 'pending' or 'pending_review'`);
    }

    // Step 8: Clean up - delete the test article
    console.log('\n8️⃣ Cleaning up test article...');
    
    const { error: deleteError } = await supabase
      .from('articles')
      .delete()
      .eq('id', draftArticle.id);

    if (deleteError) {
      console.error('⚠️  Warning: Could not delete test article:', deleteError);
      console.log(`   Please manually delete article: ${draftArticle.id}`);
    } else {
      console.log('✅ Test article cleaned up successfully');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the test
testArticleSubmissionFlow()
  .then(() => {
    console.log('\n🏁 Test completed');
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });