
/**
 * Utility functions for debate voting functionality
 */

import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const VOTED_DEBATES_KEY = 'votedDebates';

/**
 * Checks if a user has already voted on a specific debate
 * @param debateId The ID of the debate to check
 * @returns Object indicating if the user has voted and their choice if they have
 */
export const checkIfUserHasVoted = async (debateId: string): Promise<{ hasVoted: boolean; userChoice: 'yes' | 'no' | null }> => {
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
        console.error('Error checking vote status:', error);
        toast.error('There was a problem checking your vote status');
      }
      
      if (data) {
        return {
          hasVoted: true,
          userChoice: data.vote as 'yes' | 'no'
        };
      }
    } else {
      // Fallback to localStorage for non-authenticated users
      const votedDebates = JSON.parse(localStorage.getItem(VOTED_DEBATES_KEY) || '{}');
      if (votedDebates[debateId]) {
        return {
          hasVoted: true,
          userChoice: votedDebates[debateId] as 'yes' | 'no'
        };
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
    // Get the yes votes
    const { count: yesCount, error: yesError } = await supabase
      .from('article_votes')
      .select('*', { count: 'exact', head: true })
      .eq('article_id', debateId)
      .eq('vote', 'yes');
      
    if (yesError) {
      console.error('Error fetching yes votes:', yesError);
      return { yes: 0, no: 0 };
    }
    
    // Get the no votes
    const { count: noCount, error: noError } = await supabase
      .from('article_votes')
      .select('*', { count: 'exact', head: true })
      .eq('article_id', debateId)
      .eq('vote', 'no');
      
    if (noError) {
      console.error('Error fetching no votes:', noError);
      return { yes: 0, no: 0 };
    }
    
    return {
      yes: yesCount || 0,
      no: noCount || 0
    };
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
    // First check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // Record vote in the database
      const { error } = await supabase
        .from('article_votes')
        .upsert({
          article_id: debateId,
          user_id: session.user.id,
          vote: choice
        });
      
      if (error) {
        console.error('Error recording vote:', error);
        toast.error('There was a problem saving your vote');
      } else {
        toast.success(`Your vote (${choice}) has been recorded!`);
      }
    } else {
      // Fallback to localStorage for non-authenticated users
      const votedDebates = JSON.parse(localStorage.getItem(VOTED_DEBATES_KEY) || '{}');
      votedDebates[debateId] = choice;
      localStorage.setItem(VOTED_DEBATES_KEY, JSON.stringify(votedDebates));
      toast.success(`Your vote (${choice}) has been recorded locally!`);
    }
  } catch (error) {
    console.error('Error recording vote:', error);
    toast.error('There was a problem saving your vote');
  }
};

/**
 * Subscribes to real-time vote updates for a debate
 * @param debateId The debate ID
 * @param callback Function to call when votes change
 * @returns Unsubscribe function
 */
export const subscribeToVoteUpdates = (
  debateId: string, 
  callback: (votes: {yes: number, no: number}) => void
): (() => void) => {
  // Set up realtime subscription for votes
  const votesChannel = supabase
    .channel(`debate_votes_${debateId}`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'article_votes',
        filter: `article_id=eq.${debateId}` 
      }, 
      async () => {
        // Fetch latest vote counts when changes occur
        const counts = await fetchVoteCounts(debateId);
        callback(counts);
      }
    )
    .subscribe();
    
  // Return unsubscribe function
  return () => {
    supabase.removeChannel(votesChannel);
  };
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
