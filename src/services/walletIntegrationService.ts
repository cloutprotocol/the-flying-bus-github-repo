import { supabase } from '@/integrations/supabase/client';
import { inAppWallet } from 'thirdweb/wallets';
import { client } from '../../wallet/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export interface WalletCreationResult {
  success: boolean;
  walletAddress?: string;
  error?: string;
}

/**
 * Creates a Thirdweb wallet for a user and links it to their account
 * This function creates a wallet using the user's email and links it to their profile
 */
export async function createUserWallet(userId: string, userEmail: string): Promise<WalletCreationResult> {
  try {
    logger.info(LogSource.AUTH, 'Creating wallet for user', { userId, userEmail });

    // Always disconnect any existing wallet in the browser/session
    const wallet = inAppWallet();
    await wallet.disconnect();

    // Step 1: Send verification code to email using iframe_email_verification
    await wallet.connect({
      strategy: "iframe_email_verification",
      email: userEmail,
      client
    });

    // Step 2: Prompt user for verification code
    const verificationCode = window.prompt("Enter the verification code sent to your email to create your wallet:");
    if (!verificationCode) {
      throw new Error('Verification code is required to create wallet');
    }

    // Step 3: Complete wallet connection with verification code
    await wallet.connect({
      strategy: "email",
      email: userEmail,
      verificationCode,
      client
    });

    // Get the wallet address from the connected wallet
    const account = wallet.getAccount();
    const walletAddress = account?.address;
    if (!walletAddress) {
      throw new Error('Failed to get wallet address after authentication');
    }

    // Update the user's profile with the wallet address
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        crypto_wallet_address: walletAddress,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      logger.error(LogSource.AUTH, 'Error updating user profile with wallet address', updateError);
      return {
        success: false,
        error: 'Failed to link wallet to user account'
      };
    }

    logger.info(LogSource.AUTH, 'Wallet created and linked successfully', { 
      userId, 
      walletAddress 
    });

    return {
      success: true,
      walletAddress
    };

  } catch (error) {
    logger.error(LogSource.AUTH, 'Error creating user wallet', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Links an existing wallet to a user account
 */
export async function linkExistingWallet(userId: string, walletAddress: string): Promise<WalletCreationResult> {
  try {
    logger.info(LogSource.AUTH, 'Linking existing wallet to user', { userId, walletAddress });

    const { error } = await supabase
      .from('profiles')
      .update({ 
        crypto_wallet_address: walletAddress,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      logger.error(LogSource.AUTH, 'Error linking wallet to user account', error);
      return {
        success: false,
        error: 'Failed to link wallet to user account'
      };
    }

    logger.info(LogSource.AUTH, 'Wallet linked successfully', { userId, walletAddress });

    return {
      success: true,
      walletAddress
    };

  } catch (error) {
    logger.error(LogSource.AUTH, 'Error linking wallet', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Gets the wallet address for a user
 */
export async function getUserWalletAddress(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('crypto_wallet_address')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error(LogSource.AUTH, 'Error fetching user wallet address', error);
      return null;
    }

    return data.crypto_wallet_address || null;

  } catch (error) {
    logger.error(LogSource.AUTH, 'Exception fetching user wallet address', error);
    return null;
  }
}

/**
 * Checks if a user has a linked wallet
 */
export async function hasLinkedWallet(userId: string): Promise<boolean> {
  const walletAddress = await getUserWalletAddress(userId);
  return !!walletAddress;
}

/**
 * Disconnects a wallet from a user account
 */
export async function disconnectUserWallet(userId: string): Promise<WalletCreationResult> {
  try {
    logger.info(LogSource.AUTH, 'Disconnecting wallet from user', { userId });

    const { error } = await supabase
      .from('profiles')
      .update({ 
        crypto_wallet_address: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      logger.error(LogSource.AUTH, 'Error disconnecting wallet from user account', error);
      return {
        success: false,
        error: 'Failed to disconnect wallet from user account'
      };
    }

    logger.info(LogSource.AUTH, 'Wallet disconnected successfully', { userId });

    return {
      success: true
    };

  } catch (error) {
    logger.error(LogSource.AUTH, 'Error disconnecting wallet', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 