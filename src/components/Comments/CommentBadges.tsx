
import React from 'react';
import { Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface CommentBadgesProps {
  badges?: string[];
}

const CommentBadges: React.FC<CommentBadgesProps> = ({ badges }) => {
  if (!badges || badges.length === 0) return null;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center">
            <Award className="h-3.5 w-3.5 text-amber-500" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="text-xs font-medium">Reader Badges:</p>
            <div className="flex flex-wrap gap-1">
              {badges.map((badge, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                  {badge}
                </Badge>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CommentBadges;
