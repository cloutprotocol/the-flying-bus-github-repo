
/**
 * Utility functions for voting functionality
 */

import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
    // First check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      logger.debug(LogSource.VOTING, 'Checking if authenticated user has voted', {
        itemId,
        userId: session.user.id
      });
      
      // Check database for user vote
      const { data, error } = await supabase
        .from('article_votes')
        .select('vote')
        .eq('article_id', itemId)
        .eq('user_id', session.user.id)
        .maybeSingle();
      
      if (error) {
        handleVoteError(error, false);
      }
      
      if (data) {
        logger.info(LogSource.VOTING, 'User has already voted', {
          itemId,
          vote: data.vote
        });
        
        return {
          hasVoted: true,
          userChoice: data.vote as 'yes' | 'no'
        };
      }
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
    logger.debug(LogSource.VOTING, 'Fetching vote counts', { itemId });
    
    // Get the yes votes
    const { count: yesCount, error: yesError } = await supabase
      .from('article_votes')
      .select('*', { count: 'exact', head: true })
      .eq('article_id', itemId)
      .eq('vote', 'yes');
      
    if (yesError) {
      handleVoteError(yesError, false);
      return { yes: 0, no: 0 };
    }
    
    // Get the no votes
    const { count: noCount, error: noError } = await supabase
      .from('article_votes')
      .select('*', { count: 'exact', head: true })
      .eq('article_id', itemId)
      .eq('vote', 'no');
      
    if (noError) {
      handleVoteError(noError, false);
      return { yes: 0, no: 0 };
    }
    
    const result = {
      yes: yesCount || 0,
      no: noCount || 0
    };
    
    logger.debug(LogSource.VOTING, 'Vote counts fetched', result);
    
    return result;
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
    
    // First check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // Record vote in the database
      const { error } = await supabase
        .from('article_votes')
        .insert({
          article_id: itemId,
          user_id: session.user.id,
          vote: choice
        });
      
      if (error) {
        handleVoteError(error, true);
      } else {
        logger.info(LogSource.VOTING, 'Vote recorded successfully', {
          itemId,
          userId: session.user.id,
          choice
        });
        
        toast({
          title: "Vote recorded",
          description: `Your vote (${choice}) has been counted!`,
          variant: "default",
        });
      }
    } else {
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
  itemId: string, 
  callback: (votes: {yes: number, no: number}) => void
): (() => void) => {
  logger.debug(LogSource.REALTIME, 'Setting up vote subscription', { itemId });
  
  // Set up realtime subscription for votes
  const votesChannel = supabase
    .channel(`votes_${itemId}`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'article_votes',
        filter: `article_id=eq.${itemId}` 
      }, 
      async () => {
        // Fetch latest vote counts when changes occur
        const counts = await fetchVoteCounts(itemId);
        callback(counts);
      }
    )
    .subscribe();
    
  logger.debug(LogSource.REALTIME, 'Vote subscription established', { itemId });
    
  // Return unsubscribe function
  return () => {
    logger.debug(LogSource.REALTIME, 'Removing vote subscription', { itemId });
    supabase.removeChannel(votesChannel);
  };
};
