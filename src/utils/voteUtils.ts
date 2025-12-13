
/**
 * Utility functions for voting functionality
 */

import { toast } from '@/components/ui/use-toast';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { handleVoteError } from '@/utils/errors/handleVoteError';

const VOTED_ITEMS_KEY = 'votedItems';

/**
 * Checks if a user has already voted on a specific item
 * @param itemId The ID of the item to check
 * @returns Object indicating if the user has voted and their choice if they have
 */
export const checkIfUserHasVoted = async (itemId: string): Promise<{ hasVoted: boolean; userChoice: 'yes' | 'no' | null }> => {
  try {
    const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
    const vote = await convex.query(api.votes.getUserVote, { articleId: itemId });
    if (vote) {
      return { hasVoted: true, userChoice: vote as 'yes' | 'no' };
    } else {
      // Fallback to localStorage for non-authenticated users
      try {
        const votedItems = JSON.parse(localStorage.getItem(VOTED_ITEMS_KEY) || '{}');
        if (votedItems[itemId]) {
          return {
            hasVoted: true,
            userChoice: votedItems[itemId] as 'yes' | 'no'
          };
        }
      } catch (storageError) {
        logger.error(LogSource.VOTING, 'Error checking local storage vote status', storageError);
      }
    }
  } catch (error) {
    handleVoteError(error, false);
  }
  
  return {
    hasVoted: false,
    userChoice: null
  };
};

/**
 * Fetches the current vote counts for an item
 * @param itemId The item ID
 * @returns Object with vote counts for yes and no
 */
export const fetchVoteCounts = async (itemId: string): Promise<{yes: number, no: number}> => {
  try {
    const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
    const result = await convex.query(api.votes.getCounts, { articleId: itemId });
    return result || { yes: 0, no: 0 };
  } catch (error) {
    handleVoteError(error, false);
    return { yes: 0, no: 0 };
  }
};

/**
 * Records a user's vote in the database or localStorage
 * @param itemId The item ID
 * @param choice The user's choice ('yes' or 'no')
 */
export const recordVote = async (itemId: string, choice: 'yes' | 'no'): Promise<void> => {
  try {
    logger.info(LogSource.VOTING, 'Recording vote', { itemId, choice });
    const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
    try {
      await convex.mutation(api.votes.recordVote, { articleId: itemId, choice });
      toast({ title: 'Vote recorded', description: `Your vote (${choice}) has been counted!`, variant: 'default' });
    } catch {
      // Fallback to localStorage for non-authenticated users
      try {
        const votedItems = JSON.parse(localStorage.getItem(VOTED_ITEMS_KEY) || '{}');
        votedItems[itemId] = choice;
        localStorage.setItem(VOTED_ITEMS_KEY, JSON.stringify(votedItems));
        
        logger.info(LogSource.VOTING, 'Vote stored locally', { itemId, choice });
        
        toast({
          title: "Vote recorded locally",
          description: "Sign in to make your vote count permanently!",
          variant: "default",
        });
      } catch (storageError) {
        logger.error(LogSource.VOTING, 'Error storing vote in local storage', storageError);
        
        toast({
          title: "Error",
          description: "There was a problem recording your vote",
          variant: "destructive",
        });
      }
    }
  } catch (error) {
    handleVoteError(error, true);
  }
};

/**
 * Subscribes to real-time vote updates for an item
 * @param itemId The item ID
 * @param callback Function to call when votes change
 * @returns Unsubscribe function
 */
export const subscribeToVoteUpdates = (
  _itemId: string, 
  _callback: (votes: {yes: number, no: number}) => void
): (() => void) => {
  // Use Convex reactive queries in components instead of manual subscriptions
  return () => {};
};
