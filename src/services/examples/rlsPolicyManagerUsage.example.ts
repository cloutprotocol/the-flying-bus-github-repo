/**
 * Example usage of RLS Policy Manager Service
 * 
 * This file demonstrates how to use the RLS Policy Manager
 * for handling profile creation with proper permissions.
 */

import { rlsPolicyManager, type ProfileCreationData, type AuthContext } from '../rlsPolicyManager';

/**
 * Example: Standard user registration with profile creation
 */
export async function exampleStandardRegistration(userData: {
  id: string;
  email: string;
  username: string;
  display_name: string;
}) {
  const profileData: ProfileCreationData = {
    id: userData.id,
    email: userData.email,
    username: userData.username,
    display_name: userData.display_name,
    role: 'reader', // Default role for standard registration
    bio: '',
    avatar_url: null
  };

  const authContext: AuthContext = {
    userId: userData.id,
    email: userData.email,
    registrationType: 'standard'
  };

  // Validate permissions first
  const hasPermission = await rlsPolicyManager.validateRegistrationPermissions(authContext);
  if (!hasPermission) {
    throw new Error('Invalid registration permissions');
  }

  // Create profile with proper RLS handling
  const result = await rlsPolicyManager.createProfileWithPermissions(profileData, authContext);
  
  if (!result.success) {
    throw new Error(`Profile creation failed: ${result.error}`);
  }

  return result.data;
}

/**
 * Example: Invitation-based author registration
 */
export async function exampleInvitationRegistration(userData: {
  id: string;
  email: string;
  username: string;
  display_name: string;
}) {
  const profileData: ProfileCreationData = {
    id: userData.id,
    email: userData.email,
    username: userData.username,
    display_name: userData.display_name,
    role: 'author', // Author role for invitation registration
    bio: '',
    avatar_url: null
  };

  const authContext: AuthContext = {
    userId: userData.id,
    email: userData.email,
    registrationType: 'invitation',
    bypassRLS: true // May need to bypass RLS for invitation registration
  };

  // Create profile with RLS bypass if needed
  const result = await rlsPolicyManager.createProfileWithPermissions(profileData, authContext);
  
  if (!result.success) {
    throw new Error(`Author profile creation failed: ${result.error}`);
  }

  return result.data;
}

/**
 * Example: Using RLS bypass for administrative operations
 */
export async function exampleAdminOperation() {
  if (!rlsPolicyManager.isServiceRoleAvailable()) {
    throw new Error('Service role not available for admin operations');
  }

  const result = await rlsPolicyManager.bypassRLSForRegistration(async (serviceClient) => {
    // Perform administrative operation with service role client
    const { data, error } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('role', 'admin');

    if (error) throw error;
    return data;
  });

  if (!result.success) {
    throw new Error(`Admin operation failed: ${result.error}`);
  }

  return result.data;
}

/**
 * Example: Error handling patterns
 */
export async function exampleErrorHandling(profileData: ProfileCreationData, authContext: AuthContext) {
  try {
    const result = await rlsPolicyManager.createProfileWithPermissions(profileData, authContext);
    
    if (!result.success) {
      // Handle different error types
      switch (result.code) {
        case 'SERVICE_ROLE_UNAVAILABLE':
          console.error('Service role not available, falling back to standard creation');
          // Implement fallback logic
          break;
        default:
          console.error('Profile creation failed:', result.error);
          // Handle other errors
          break;
      }
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('Unexpected error during profile creation:', error);
    return null;
  }
}