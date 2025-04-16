
import React from 'react';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import VoteButtons from './VoteButtons';
import VoteResults from './VoteResults';
import VoteStatus from './VoteStatus';
import { useVoting } from './useVoting';
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
  const { isLoggedIn } = useAuth();
  const {
    votes,
    hasVoted,
    isVoting,
    userChoice,
    resultsVisible,
    totalVotes,
    yesPercentage,
    noPercentage,
    handleVote
  } = useVoting(debateId, initialVotes);

  // Modified this line to pass only one argument as expected by the useVoting hook
  const onVote = (choice: 'yes' | 'no') => {
    handleVote(choice);
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
            onVote={onVote}
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
