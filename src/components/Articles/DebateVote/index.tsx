
import React from 'react';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import VoteButtons from './VoteButtons';
import VoteResults from './VoteResults';
import VoteStatus from './VoteStatus';
import { useVoting } from './useVoting';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

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
  initialVotes = { yes: 0, no: 0 } 
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

  // Enhanced logging for debugging
  React.useEffect(() => {
    logger.info(LogSource.VOTING, 'DebateVote component rendered', {
      debateId,
      topicTitle: topicTitle.substring(0, 50),
      initialVotes,
      isLoggedIn,
      hasVoted,
      userChoice,
      currentVotes: votes
    });
  }, [debateId, topicTitle, initialVotes, isLoggedIn, hasVoted, userChoice, votes]);

  const onVote = (choice: 'yes' | 'no') => {
    logger.info(LogSource.VOTING, 'Vote attempt', {
      debateId,
      choice,
      isLoggedIn,
      hasVoted
    });
    handleVote(choice);
  };

  // Error boundary fallback
  if (!debateId) {
    logger.error(LogSource.VOTING, 'DebateVote: Missing debateId');
    return (
      <Card className="overflow-hidden border-red-200 bg-red-50">
        <CardContent className="p-6">
          <p className="text-red-600">Unable to load voting component - missing debate ID</p>
        </CardContent>
      </Card>
    );
  }

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
