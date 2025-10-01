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

async function createSeedComments() {
  console.log('Creating seed comments...');

  // Get user IDs
  const { data: reader } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', 'neel@interstellarx.io')
    .single();

  const { data: admin } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', 'neelsarode@icloud.com')
    .single();

  // Get some article IDs
  const { data: articles } = await supabase
    .from('articles')
    .select('id, title')
    .limit(3);

  if (!reader || !admin || !articles) {
    console.error('Could not find users or articles');
    return;
  }

  const comments = [
    {
      article_id: articles[0].id,
      user_id: reader.id,
      content: 'This is such an inspiring story! I want to start a climate action group at my school too.',
      status: 'published'
    },
    {
      article_id: articles[0].id,
      user_id: admin.id,
      content: 'Great idea! Let us know if you need any resources to get started.',
      status: 'published'
    },
    {
      article_id: articles[1].id,
      user_id: reader.id,
      content: 'Wow! I wonder if we could visit this planet someday when I grow up.',
      status: 'published'
    },
    {
      article_id: articles[1].id,
      user_id: admin.id,
      content: 'Who knows what space travel will be like in the future! Keep dreaming big!',
      status: 'published'
    }
  ];

  for (const commentData of comments) {
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          user_id: commentData.user_id,
          article_id: commentData.article_id.toString(),
          content: commentData.content,
          status: commentData.status
        });

      if (error) {
        console.error('Error creating comment:', error);
      } else {
        console.log('Comment created successfully');
      }
    } catch (error) {
      console.error('Exception creating comment:', error);
    }
  }

  console.log('Seed comments creation completed!');
}

createSeedComments().catch(console.error);