
/**
 * Utility functions for debate voting functionality
 */

import { toast } from 'sonner';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);

const VOTED_DEBATES_KEY = 'votedDebates';

/**
 * Checks if a user has already voted on a specific debate
 * @param debateId The ID of the debate to check
 * @returns Object indicating if the user has voted and their choice if they have
 */
export const checkIfUserHasVoted = async (debateId: string): Promise<{ hasVoted: boolean; userChoice: 'yes' | 'no' | null }> => {
  try {
    const userVote = await convex.query(api.votes.getUserVote, { articleId: debateId });
    if (userVote) {
      return { hasVoted: true, userChoice: userVote as 'yes' | 'no' };
    } else {
      // Fallback to localStorage for non-authenticated users
      try {
        const votedDebates = JSON.parse(localStorage.getItem(VOTED_DEBATES_KEY) || '{}');
        if (votedDebates[debateId]) {
          return {
            hasVoted: true,
            userChoice: votedDebates[debateId] as 'yes' | 'no'
          };
        }
      } catch (storageError) {
        console.error('Error reading from localStorage:', storageError);
      }
    }
  } catch (error) {
    console.error('Error checking vote status:', error);
    toast.error('There was a problem checking your vote status');
  }
  
  return {
    hasVoted: false,
    userChoice: null
  };
};

/**
 * Fetches the current vote counts for a debate
 * @param debateId The debate ID
 * @returns Object with vote counts for yes and no
 */
export const fetchVoteCounts = async (debateId: string): Promise<{yes: number, no: number}> => {
  try {
    const result = await convex.query(api.votes.getCounts, { articleId: debateId });
    return result || { yes: 0, no: 0 };
  } catch (error) {
    console.error('Error fetching vote counts:', error);
    return { yes: 0, no: 0 };
  }
};

/**
 * Simulates checking if the user's IP has already voted
 * In a real app, this would call an API endpoint
 */
export const simulateIpCheck = async (debateId: string): Promise<boolean> => {
  try {
    // First check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // Check database for user vote
      const { data, error } = await supabase
        .from('article_votes')
        .select('vote')
        .eq('article_id', debateId)
        .eq('user_id', session.user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking IP vote status:', error);
      }
      
      return !!data;
    } else {
      // Fallback to localStorage for non-authenticated users
      return new Promise((resolve) => {
        setTimeout(() => {
          try {
            const votedDebates = JSON.parse(localStorage.getItem(VOTED_DEBATES_KEY) || '{}');
            resolve(!!votedDebates[debateId]);
          } catch (error) {
            console.error('Error checking IP vote status:', error);
            resolve(false);
          }
        }, 600);
      });
    }
  } catch (error) {
    console.error('Error checking IP vote status:', error);
    return false;
  }
};

/**
 * Records a user's vote in the database or localStorage
 * @param debateId The debate ID
 * @param choice The user's choice ('yes' or 'no')
 */
export const recordVote = async (debateId: string, choice: 'yes' | 'no'): Promise<void> => {
  try {
    try {
      await convex.mutation(api.votes.recordVote, { articleId: debateId, choice });
      console.log(`Vote recorded successfully: ${choice} for debate ${debateId}`);
    } catch (err) {
      // Fallback to localStorage for non-authenticated users
      const votedDebates = JSON.parse(localStorage.getItem(VOTED_DEBATES_KEY) || '{}');
      votedDebates[debateId] = choice;
      localStorage.setItem(VOTED_DEBATES_KEY, JSON.stringify(votedDebates));
      console.log(`Vote recorded locally: ${choice} for debate ${debateId}`);
    }
  } catch (error) {
    console.error('Error recording vote:', error);
    toast.error('There was a problem saving your vote');
    throw error;
  }
};

/**
 * Subscribes to real-time vote updates for a debate
 * @param debateId The debate ID
 * @param callback Function to call when votes change
 * @returns Unsubscribe function
 */
export const subscribeToVoteUpdates = (
  _debateId: string, 
  _callback: (votes: {yes: number, no: number}) => void
): (() => void) => {
  // Convex reactive queries should be used instead of manual subscriptions.
  return () => {};
};

/**
 * Clears all votes (for testing purposes)
 */
export const clearAllVotes = async (): Promise<void> => {
  try {
    // Clear local storage votes
    localStorage.removeItem(VOTED_DEBATES_KEY);
    
    // For authenticated users, we can't delete from database here
    // as it would require admin privileges
    
    toast.success('Local vote data has been cleared');
  } catch (error) {
    console.error('Error clearing votes:', error);
    toast.error('There was a problem clearing your votes');
  }
};
