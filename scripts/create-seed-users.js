#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Local Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'; // Service role key from output

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createSeedUsers() {
  console.log('Creating seed users...');

  const users = [
    {
      email: 'neelsarode@icloud.com',
      password: 'Temporary123',
      role: 'admin',
      username: 'admin_neel',
      display_name: 'Neel Sarode (Admin)',
      bio: 'Platform administrator and content moderator',
      public_bio: 'Ensuring a safe and engaging platform for young readers',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
    },
    {
      email: 'neel@conversiondesigner.co',
      password: 'Temporary123',
      role: 'author',
      username: 'author_neel',
      display_name: 'Neel Sarode (Author)',
      bio: 'Passionate about creating engaging content for young minds',
      public_bio: 'Writer and educator focused on making learning fun and accessible',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      favorite_categories: ['Learning', 'Headliners', 'Debates']
    },
    {
      email: 'neel@interstellarx.io',
      password: 'Temporary123',
      role: 'reader',
      username: 'reader_neel',
      display_name: 'Neel Sarode (Reader)',
      bio: 'Curious reader always looking for interesting stories',
      public_bio: 'Young reader who loves science and technology',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face',
      favorite_categories: ['Learning', 'Spice It Up', 'Storyboard']
    }
  ];

  for (const userData of users) {
    try {
      console.log(`Creating user: ${userData.email}`);
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          role: userData.role
        }
      });

      if (authError) {
        console.error(`Error creating auth user ${userData.email}:`, authError);
        continue;
      }

      console.log(`Auth user created: ${authData.user.id}`);

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          username: userData.username,
          display_name: userData.display_name,
          email: userData.email,
          role: userData.role,
          bio: userData.bio,
          public_bio: userData.public_bio,
          avatar_url: userData.avatar_url,
          favorite_categories: userData.favorite_categories || null
        });

      if (profileError) {
        console.error(`Error creating profile for ${userData.email}:`, profileError);
      } else {
        console.log(`Profile created for: ${userData.email}`);
      }

    } catch (error) {
      console.error(`Exception creating user ${userData.email}:`, error);
    }
  }

  console.log('Seed users creation completed!');
}

createSeedUsers().catch(console.error);