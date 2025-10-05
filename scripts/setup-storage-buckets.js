#!/usr/bin/env node

/**
 * Storage Bucket Setup Script
 * 
 * This script creates the required storage buckets for The Flying Bus app.
 * It's designed to be idempotent and safe to run multiple times.
 * 
 * Usage:
 * - Local: node scripts/setup-storage-buckets.js
 * - Remote: node scripts/setup-storage-buckets.js --project-ref PROJECT_ID
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const projectRefIndex = args.indexOf('--project-ref');
const projectRef = projectRefIndex !== -1 ? args[projectRefIndex + 1] : null;

// Configuration for different environments
const getConfig = () => {
  if (projectRef) {
    // Remote environment
    return {
      url: `https://${projectRef}.supabase.co`,
      // Note: You'll need to provide the service role key for the specific project
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'REPLACE_WITH_SERVICE_ROLE_KEY',
      environment: `Remote (${projectRef})`
    };
  } else {
    // Local environment
    return {
      url: 'http://127.0.0.1:54321',
      serviceKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
      environment: 'Local Development'
    };
  }
};

// Bucket configurations
const BUCKET_CONFIGS = [
  {
    name: 'media',
    public: true,
    description: 'General media uploads and profile pictures'
  }
];

async function createStorageBucket(supabase, bucketConfig) {
  console.log(`📁 Creating bucket: ${bucketConfig.name}`);
  
  try {
    // Try to create the bucket
    const { data, error } = await supabase.storage.createBucket(bucketConfig.name, {
      public: bucketConfig.public,
      allowedMimeTypes: ['image/*', 'video/*', 'audio/*'],
      fileSizeLimit: 50 * 1024 * 1024 // 50MB limit
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log(`   ✅ Bucket '${bucketConfig.name}' already exists`);
        return true;
      } else {
        console.error(`   ❌ Error creating bucket '${bucketConfig.name}':`, error.message);
        return false;
      }
    }

    console.log(`   ✅ Bucket '${bucketConfig.name}' created successfully`);
    return true;
  } catch (error) {
    console.error(`   ❌ Exception creating bucket '${bucketConfig.name}':`, error.message);
    return false;
  }
}

async function setupStorageBuckets() {
  const config = getConfig();
  
  console.log('🚀 Setting up storage buckets...');
  console.log(`📍 Environment: ${config.environment}`);
  console.log(`🔗 URL: ${config.url}`);
  console.log('');

  if (config.serviceKey === 'REPLACE_WITH_SERVICE_ROLE_KEY') {
    console.error('❌ Please set SUPABASE_SERVICE_ROLE_KEY environment variable or update the script');
    console.log('');
    console.log('For remote environments, you need the service role key from:');
    console.log('Supabase Dashboard → Settings → API → service_role key');
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(config.url, config.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  let allSuccess = true;

  // Create each bucket
  for (const bucketConfig of BUCKET_CONFIGS) {
    const success = await createStorageBucket(supabase, bucketConfig);
    if (!success) {
      allSuccess = false;
    }
  }

  console.log('');
  if (allSuccess) {
    console.log('🎉 All storage buckets set up successfully!');
    console.log('');
    console.log('📋 Created buckets:');
    BUCKET_CONFIGS.forEach(bucket => {
      console.log(`   • ${bucket.name} (${bucket.public ? 'public' : 'private'}) - ${bucket.description}`);
    });
  } else {
    console.log('⚠️  Some buckets failed to create. Check the errors above.');
    process.exit(1);
  }
}

// Check environment before running
async function checkEnvironment() {
  const config = getConfig();
  
  try {
    const response = await fetch(`${config.url}/rest/v1/`, {
      headers: {
        'apikey': config.serviceKey.startsWith('eyJ') ? 
          // For remote, we need the anon key for health check, but we'll use service key for operations
          config.serviceKey : 
          // For local, use the demo anon key
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
      }
    });
    
    if (!response.ok && response.status !== 404) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Cannot connect to ${config.environment} Supabase!`);
    console.log('');
    if (projectRef) {
      console.log('Please check:');
      console.log('1. The project reference is correct');
      console.log('2. Your internet connection');
      console.log('3. The project is active');
    } else {
      console.log('Please start local Supabase first:');
      console.log('   supabase start');
    }
    console.log('');
    process.exit(1);
  }
}

// Main execution
async function main() {
  await checkEnvironment();
  await setupStorageBuckets();
}

main().catch(console.error);