#!/usr/bin/env node

/**
 * Populate Categories Script
 * 
 * This script populates the categories table in the LOCAL Supabase database
 * with the 7 article categories defined in the PRD.
 */

import { createClient } from '@supabase/supabase-js';

// Local Supabase configuration
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Categories from PRD
const categories = [
  {
    name: 'Headliners',
    slug: 'headliners',
    description: 'Breaking news and current events',
    icon: 'headliners-icon.svg',
    color: '#F93827'
  },
  {
    name: 'Debates',
    slug: 'debates',
    description: 'Discussion topics with multiple viewpoints',
    icon: 'debates-icon.svg',
    color: '#4FB9D0'
  },
  {
    name: 'Learning',
    slug: 'learning',
    description: 'Educational content and tutorials',
    icon: 'learning-icon.svg',
    color: '#315057'
  },
  {
    name: 'Neighborhood',
    slug: 'neighborhood',
    description: 'Local community news and events',
    icon: 'neighborhood-icon.svg',
    color: '#16C47F'
  },
  {
    name: 'School News',
    slug: 'school-news',
    description: 'School-related updates and information',
    icon: 'school-news-icon.svg',
    color: '#F93827'
  },
  {
    name: 'Spice It Up',
    slug: 'spice-it-up',
    description: 'Entertainment, fun facts, and lighter content',
    icon: 'spice-it-up-icon.svg',
    color: '#FFCA58'
  },
  {
    name: 'Storyboard',
    slug: 'storyboard',
    description: 'Creative writing, stories, and serialized content',
    icon: 'storyboard-icon.svg',
    color: '#4FB9D0'
  }
];

async function populateCategories() {
  console.log('🚀 Starting category population...');
  
  try {
    // Check if categories already exist
    const { data: existingCategories, error: checkError } = await supabase
      .from('categories')
      .select('name');
    
    if (checkError) {
      throw new Error(`Error checking existing categories: ${checkError.message}`);
    }
    
    if (existingCategories && existingCategories.length > 0) {
      console.log(`⚠️  Found ${existingCategories.length} existing categories:`);
      existingCategories.forEach(cat => console.log(`   - ${cat.name}`));
      console.log('   Skipping population to avoid duplicates.');
      return;
    }
    
    // Insert categories
    console.log(`📝 Inserting ${categories.length} categories...`);
    
    const { data, error } = await supabase
      .from('categories')
      .insert(categories)
      .select();
    
    if (error) {
      throw new Error(`Error inserting categories: ${error.message}`);
    }
    
    console.log('✅ Successfully populated categories:');
    data.forEach(category => {
      console.log(`   - ${category.name} (${category.slug})`);
    });
    
    // Verify the insertion
    const { data: verifyData, error: verifyError } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (verifyError) {
      throw new Error(`Error verifying categories: ${verifyError.message}`);
    }
    
    console.log(`\n🎉 Total categories in database: ${verifyData.length}`);
    
  } catch (error) {
    console.error('❌ Error populating categories:', error.message);
    process.exit(1);
  }
}

// Run the script
populateCategories();