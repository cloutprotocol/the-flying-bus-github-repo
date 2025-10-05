#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Local Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkSeedData() {
  console.log('🔍 Checking seed data in local Supabase...\n');

  try {
    // Check categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*');
    
    console.log(`📚 Categories: ${categories?.length || 0}`);
    if (categories) {
      categories.forEach(cat => console.log(`  - ${cat.name} (${cat.slug})`));
    }
    console.log();

    // Check users/profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*');
    
    console.log(`👥 Users/Profiles: ${profiles?.length || 0}`);
    if (profiles) {
      profiles.forEach(profile => console.log(`  - ${profile.display_name} (${profile.email}) - Role: ${profile.role}`));
    }
    console.log();

    // Check articles (using service role to bypass RLS)
    const { data: articles, error: articleError } = await supabase
      .from('articles')
      .select(`
        *,
        categories(name),
        profiles(display_name)
      `);
    
    console.log(`📰 Articles: ${articles?.length || 0}`);
    if (articles) {
      articles.forEach(article => {
        console.log(`  - ${article.title}`);
        console.log(`    Category: ${article.categories?.name || 'Unknown'}`);
        console.log(`    Author: ${article.profiles?.display_name || 'Unknown'}`);
        console.log(`    Status: ${article.status}`);
        console.log(`    Featured: ${article.featured ? 'Yes' : 'No'}`);
        console.log();
      });
    }

    // Check comments
    const { data: comments, error: commentError } = await supabase
      .from('comments')
      .select(`
        *,
        profiles(display_name)
      `);
    
    console.log(`💬 Comments: ${comments?.length || 0}`);
    if (comments) {
      comments.forEach(comment => {
        console.log(`  - By ${comment.profiles?.display_name || 'Unknown'}: "${comment.content.substring(0, 50)}..."`);
      });
    }
    console.log();

    // Check tags
    const { data: tags, error: tagError } = await supabase
      .from('tags')
      .select('*');
    
    console.log(`🏷️ Tags: ${tags?.length || 0}`);
    if (tags) {
      tags.forEach(tag => console.log(`  - ${tag.name} (${tag.slug})`));
    }
    console.log();

    console.log('✅ Seed data check completed!');
    console.log('\n🚀 Your local Supabase is ready for development!');
    console.log('\n📋 Login Credentials:');
    console.log('  Admin: neelsarode@icloud.com / Temporary123');
    console.log('  Author: neel@conversiondesigner.co / Temporary123');
    console.log('  Reader: neel@interstellarx.io / Temporary123');
    console.log('\n🌐 Local URLs:');
    console.log('  API: http://127.0.0.1:54321');
    console.log('  Studio: http://127.0.0.1:54323');
    console.log('  Database: postgresql://postgres:postgres@127.0.0.1:54322/postgres');

  } catch (error) {
    console.error('Error checking seed data:', error);
  }
}

checkSeedData().catch(console.error);