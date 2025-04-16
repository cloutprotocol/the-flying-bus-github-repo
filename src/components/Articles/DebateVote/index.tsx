
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import VoteButtons from './VoteButtons';
import VoteResults from './VoteResults';
import VoteStatus from './VoteStatus';
import { 
  checkIfUserHasVoted, 
  simulateIpCheck, 
  recordVote, 
  fetchVoteCounts,
  subscribeToVoteUpdates
} from './voteUtils';
import { useAuth } from '@/contexts/AuthContext';

interface DebateVoteProps {
  debateId: string;
  topicTitle: string;
  initialVotes?: {
    yes: number;
    no: number;
  };
}

const DebateVote = ({ 
  debateId, 
  topicTitle, 
  initialVotes = { yes: 50, no: 50 } 
}: DebateVoteProps) => {
  const [votes, setVotes] = useState(initialVotes);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [userChoice, setUserChoice] = useState<'yes' | 'no' | null>(null);
  const [resultsVisible, setResultsVisible] = useState(false);
  const { isLoggedIn } = useAuth();
  
  const totalVotes = votes.yes + votes.no;
  const yesPercentage = totalVotes > 0 ? Math.round((votes.yes / totalVotes) * 100) : 0;
  const noPercentage = totalVotes > 0 ? Math.round((votes.no / totalVotes) * 100) : 0;

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const initializeVotes = async () => {
      // Check if user has already voted
      const result = await checkIfUserHasVoted(debateId);
      if (result.hasVoted) {
        setHasVoted(true);
        setUserChoice(result.userChoice);
        setResultsVisible(true);
      }
      
      // Fetch initial vote counts from backend
      const currentVotes = await fetchVoteCounts(debateId);
      if (currentVotes.yes > 0 || currentVotes.no > 0) {
        setVotes(currentVotes);
      }
      
      // Subscribe to real-time vote updates
      unsubscribe = subscribeToVoteUpdates(debateId, (updatedVotes) => {
        console.log('Vote update received:', updatedVotes);
        setVotes(updatedVotes);
      });
    };
    
    initializeVotes();
    
    // Clean up subscription on component unmount
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [debateId]);

  const handleVote = async (choice: 'yes' | 'no') => {
    if (!isLoggedIn) {
      toast.error("Please sign in to vote on debates!", {
        description: "Create an account or sign in to participate in debates.",
        action: {
          label: "Sign In",
          onClick: () => window.location.href = "/reader-auth?tab=sign-in",
        },
      });
      return;
    }

    if (hasVoted) {
      toast.warning("You've already voted on this debate!");
      return;
    }

    setIsVoting(true);
    setResultsVisible(false);

    try {
      // Check if this debate ID has been voted on already
      const voteResult = await checkIfUserHasVoted(debateId);
      
      if (voteResult.hasVoted) {
        toast.warning("You've already voted on this debate!");
        setHasVoted(true);
        setUserChoice(voteResult.userChoice);
        setIsVoting(false);
        setResultsVisible(true);
        return;
      }

      // Simulate checking if IP has voted
      const hasIpVoted = await simulateIpCheck(debateId);
      
      if (hasIpVoted) {
        toast.warning("A vote from your location has already been recorded!");
        setHasVoted(true);
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
        toast.success("Your vote has been counted! Thanks for participating!");
      }, 800);
      
    } catch (error) {
      toast.error("There was a problem recording your vote. Please try again.");
      console.error("Voting error:", error);
      setIsVoting(false);
    }
  };

  return (
    <Card className="overflow-hidden border-none shadow-md">
      <CardHeader className="bg-gradient-to-r from-flyingbus-purple/10 to-flyingbus-blue/10 pb-4">
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles size={18} className="text-flyingbus-purple" />
            <h3 className="text-xl font-semibold text-gray-900">
              What do you think?
            </h3>
          </div>
          
          <div className="inline-flex items-center bg-white/60 backdrop-blur-sm text-flyingbus-purple px-4 py-2 rounded-full text-sm font-medium shadow-sm border border-flyingbus-purple/20">
            {topicTitle}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 pt-5">
        <div className="flex flex-col space-y-6">
          <VoteButtons 
            onVote={handleVote}
            hasVoted={hasVoted}
            isVoting={isVoting}
            userChoice={userChoice}
            yesPercentage={yesPercentage}
            noPercentage={noPercentage}
          />
          
          <div className={`transition-all duration-500 ease-in-out ${
            resultsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            {hasVoted && resultsVisible && (
              <VoteResults 
                votes={votes}
                yesPercentage={yesPercentage}
                noPercentage={noPercentage}
                totalVotes={totalVotes}
              />
            )}
          </div>
          
          <VoteStatus 
            hasVoted={hasVoted} 
            isVoting={isVoting} 
            isLoggedIn={isLoggedIn}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default DebateVote;
