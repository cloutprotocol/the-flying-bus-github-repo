
import { useState, useEffect } from 'react';
import { toast } from '@/components/ui/use-toast';
import { 
  checkIfUserHasVoted, 
  fetchVoteCounts,
  recordVote,
  subscribeToVoteUpdates
} from '@/utils/voteUtils';
import { supabase } from '@/integrations/supabase/client';
import { handleVoteError } from '@/utils/errors/handleVoteError';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

export const useDebateVoting = (debateId: string, initialVotes = { yes: 0, no: 0 }) => {
  const [votes, setVotes] = useState(initialVotes);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [userChoice, setUserChoice] = useState<'yes' | 'no' | null>(null);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Calculate percentages
  const totalVotes = votes.yes + votes.no;
  const yesPercentage = totalVotes > 0 ? Math.round((votes.yes / totalVotes) * 100) : 0;
  const noPercentage = totalVotes > 0 ? Math.round((votes.no / totalVotes) * 100) : 0;

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const initializeVotes = async () => {
      try {
        // Check if user has already voted
        const result = await checkIfUserHasVoted(debateId);
        if (result.hasVoted) {
          setHasVoted(true);
          setUserChoice(result.userChoice);
          setResultsVisible(true);
        }
        
        // Fetch initial vote counts from backend
        const currentVotes = await fetchVoteCounts(debateId);
        setVotes(currentVotes);
        
        // Subscribe to real-time vote updates
        unsubscribe = subscribeToVoteUpdates(debateId, (updatedVotes) => {
          logger.debug(LogSource.VOTING, 'Vote update received:', updatedVotes);
          setVotes(updatedVotes);
        });
      } catch (error) {
        handleVoteError(error, true);
      }
    };
    
    initializeVotes();
    
    // Clean up subscription on component unmount
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [debateId]);

  const handleVote = async (choice: 'yes' | 'no') => {
    if (!isLoggedIn) {
      toast({
        title: "Sign in required",
        description: "Please sign in to vote on debates",
        variant: "default",
      });
      return;
    }

    if (hasVoted) {
      toast({
        title: "Already voted",
        description: "You've already voted on this debate",
        variant: "default",
      });
      return;
    }

    setIsVoting(true);
    setResultsVisible(false);

    try {
      logger.info(LogSource.VOTING, 'User voting on debate', {
        debateId,
        choice
      });
      
      // Check if this debate ID has been voted on already
      const voteResult = await checkIfUserHasVoted(debateId);
      
      if (voteResult.hasVoted) {
        toast({
          title: "Already voted",
          description: "You've already voted on this debate",
          variant: "default",
        });
        setHasVoted(true);
        setUserChoice(voteResult.userChoice);
        setIsVoting(false);
        setResultsVisible(true);
        return;
      }

      // Record the vote - this will trigger the real-time subscription
      await recordVote(debateId, choice);
      
      // Optimistically update UI
      setVotes(prev => ({
        ...prev,
        [choice]: prev[choice] + 1
      }));
      
      setUserChoice(choice);
      setHasVoted(true);
      
      // Short delay before showing results for a smoother transition
      setTimeout(() => {
        setResultsVisible(true);
        setIsVoting(false);
        toast({
          title: "Vote counted",
          description: "Thanks for participating in this debate!",
          variant: "default",
        });
      }, 800);
      
    } catch (error) {
      handleVoteError(error, true);
      setIsVoting(false);
    }
  };

  return {
    votes,
    hasVoted,
    isVoting,
    userChoice,
    resultsVisible,
    totalVotes,
    yesPercentage,
    noPercentage,
    handleVote,
    setResultsVisible,
    isLoggedIn
  };
};

export default useDebateVoting;
