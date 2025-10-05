#!/usr/bin/env node

/**
 * Test the fixed article submission flow
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

// Use local Supabase for testing
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFixedSubmissionFlow() {
  console.log('🧪 Testing Fixed Article Submission Flow');
  console.log('========================================');

  try {
    // Step 1: Create a test user and sign in
    console.log('\n1️⃣ Setting up test user...');
    
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (signUpError) {
      console.error('❌ Error creating test user:', signUpError);
      return;
    }

    console.log(`✅ Test user created: ${signUpData.user?.id}`);
    
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

    // Step 3: Test the submit_article_with_validation function
    console.log('\n3️⃣ Testing article submission with fixed function...');
    
    const testArticleData = {
      title: `Test Article Fixed Submission ${new Date().toISOString()}`,
      content: '<p>This is a test article to verify the fixed submission flow works correctly.</p>',
      excerpt: 'Test article for fixed submission flow verification',
      categoryId: categoryId,
      articleType: 'standard',
      slug: `test-article-fixed-${Date.now()}`
    };

    const { data: submissionResult, error: submissionError } = await supabase
      .rpc('submit_article_with_validation', {
        p_user_id: signUpData.user.id,
        p_article_data: testArticleData,
        p_save_draft: false
      });

    if (submissionError) {
      console.error('❌ Error submitting article:', submissionError);
      return;
    }

    console.log('📤 Submission result:', submissionResult);

    if (!submissionResult || !submissionResult[0]?.success) {
      console.error('❌ Submission failed:', submissionResult?.[0]?.error_message);
      return;
    }

    const articleId = submissionResult[0].article_id;
    console.log(`✅ Article submitted successfully: ${articleId}`);

    // Step 4: Check the article status
    console.log('\n4️⃣ Checking article status...');
    
    const { data: article, error: fetchError } = await supabase
      .from('articles')
      .select('id, title, status, submitted_for_review_at, updated_at')
      .eq('id', articleId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching article:', fetchError);
      return;
    }

    console.log(`✅ Article status: ${article.status}`);
    console.log(`   Submitted for review at: ${article.submitted_for_review_at}`);
    console.log(`   Updated at: ${article.updated_at}`);

    // Step 5: Check if article appears in admin approval queue
    console.log('\n5️⃣ Checking admin approval queue...');
    
    const { data: pendingArticles, error: queueError } = await supabase
      .from('articles')
      .select(`
        id,
        title,
        status,
        submitted_for_review_at,
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
      .order('submitted_for_review_at', { ascending: false });

    if (queueError) {
      console.error('❌ Error fetching approval queue:', queueError);
      return;
    }

    console.log(`📋 Articles in approval queue: ${pendingArticles.length}`);
    
    if (pendingArticles.length > 0) {
      console.log('\n📝 Articles pending review:');
      pendingArticles.forEach((article, index) => {
        console.log(`   ${index + 1}. ${article.title} (${article.status})`);
        console.log(`      ID: ${article.id}`);
        console.log(`      Submitted: ${article.submitted_for_review_at}`);
        console.log('');
      });
    }

    // Step 6: Verify our test article is in the queue
    const ourArticleInQueue = pendingArticles.find(a => a.id === articleId);
    
    if (ourArticleInQueue) {
      console.log(`✅ SUCCESS: Test article found in approval queue!`);
      console.log(`   Status: ${ourArticleInQueue.status}`);
      console.log(`   This confirms the fix is working correctly.`);
    } else {
      console.log(`❌ ISSUE: Test article NOT found in approval queue`);
      console.log(`   Current status: ${article.status}`);
    }

    // Step 7: Test the admin approval queue query specifically
    console.log('\n6️⃣ Testing admin approval queue query...');
    
    // This simulates what the useSimpleApprovalQueue hook does
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
      console.error('❌ Error with admin queue query:', adminError);
    } else {
      console.log(`✅ Admin queue query successful: ${adminQueueArticles.length} articles`);
      
      const ourArticleInAdminQueue = adminQueueArticles.find(a => a.id === articleId);
      if (ourArticleInAdminQueue) {
        console.log(`✅ Test article visible to admin interface`);
      } else {
        console.log(`❌ Test article NOT visible to admin interface`);
      }
    }

    // Step 8: Clean up
    console.log('\n7️⃣ Cleaning up...');
    
    const { error: deleteError } = await supabase
      .from('articles')
      .delete()
      .eq('id', articleId);

    if (deleteError) {
      console.error('⚠️  Warning: Could not delete test article:', deleteError);
    } else {
      console.log('✅ Test article cleaned up');
    }

    // Sign out test user
    await supabase.auth.signOut();
    console.log('✅ Test user signed out');

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the test
testFixedSubmissionFlow()
  .then(() => {
    console.log('\n🏁 Test completed');
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });