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

async function addSampleArticles() {
  console.log('Adding sample articles with service role...');

  // Get author and categories
  const { data: author } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', 'neel@conversiondesigner.co')
    .single();

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name');

  if (!author || !categories) {
    console.error('Missing author or categories');
    return;
  }

  const categoryMap = {};
  categories.forEach(cat => {
    categoryMap[cat.name] = cat.id;
  });

  console.log('Author ID:', author.id);
  console.log('Categories found:', categories.length);

  // Create articles with explicit service role bypass
  const articles = [
    {
      title: 'Kids from Around the World Unite for Climate Change Action',
      slug: 'kids-climate-change-summit-2025',
      content: '<h2>Young Voices Making a Difference</h2><p>In an unprecedented virtual summit, over 500 young activists from 25 countries came together to discuss climate change solutions.</p>',
      excerpt: 'Young activists from over 20 countries participated in a virtual summit to discuss and propose solutions for climate change.',
      category: 'Headliners',
      cover_image: 'https://images.unsplash.com/photo-1604326531570-2689ea7ae287?w=800&auto=format&fit=crop',
      featured: true
    },
    {
      title: 'DIY Science Experiments You Can Do at Home',
      slug: 'diy-science-experiments-home',
      content: '<h2>Amazing Science at Home!</h2><p>Turn your kitchen into a laboratory with these safe and exciting experiments.</p>',
      excerpt: 'Learn how to create amazing science experiments with everyday household items.',
      category: 'Learning',
      cover_image: 'https://images.unsplash.com/photo-1603356033288-acfcb54801e6?w=800&auto=format&fit=crop',
      featured: false
    },
    {
      title: '10 Amazing Animal Facts That Will Blow Your Mind',
      slug: 'amazing-animal-facts-2025',
      content: '<h2>Prepare to Be Amazed!</h2><p>The animal kingdom is full of incredible surprises.</p>',
      excerpt: 'Discover incredible and surprising facts about animals that will amaze and delight young readers.',
      category: 'Spice It Up',
      cover_image: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=800&auto=format&fit=crop',
      featured: false
    }
  ];

  for (const articleData of articles) {
    try {
      console.log(`Creating: ${articleData.title}`);
      
      const { data, error } = await supabase
        .from('articles')
        .insert({
          title: articleData.title,
          slug: articleData.slug,
          content: articleData.content,
          excerpt: articleData.excerpt,
          author_id: author.id,
          category_id: categoryMap[articleData.category],
          cover_image: articleData.cover_image,
          status: 'published',
          published_at: new Date().toISOString(),
          article_type: 'standard',
          featured: articleData.featured,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error(`Error creating ${articleData.title}:`, error);
      } else {
        console.log(`✅ Created: ${articleData.title}`);
      }
    } catch (error) {
      console.error(`Exception creating ${articleData.title}:`, error);
    }
  }

  // Add some comments
  const { data: createdArticles } = await supabase.from('articles').select('id').limit(2);
  const { data: reader } = await supabase.from('profiles').select('id').eq('email', 'neel@interstellarx.io').single();
  
  if (createdArticles && createdArticles.length > 0 && reader) {
    console.log('Adding sample comments...');
    
    await supabase.from('comments').insert([
      {
        user_id: reader.id,
        article_id: createdArticles[0].id.toString(),
        content: 'This is such an inspiring story! I want to start a climate action group at my school too.',
        status: 'published'
      },
      {
        user_id: reader.id,
        article_id: createdArticles[1]?.id.toString() || createdArticles[0].id.toString(),
        content: 'These experiments look so fun! I can\'t wait to try them.',
        status: 'published'
      }
    ]);
    
    console.log('✅ Comments added');
  }

  console.log('\n🎉 Sample articles and comments created successfully!');
}

addSampleArticles().catch(console.error);