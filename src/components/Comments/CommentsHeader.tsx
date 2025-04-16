
import React from 'react';
import { MessageCircle } from 'lucide-react';

interface CommentsHeaderProps {
  commentCount: number;
}

const CommentsHeader: React.FC<CommentsHeaderProps> = ({ commentCount }) => {
  return (
    <h3 className="text-xl font-semibold flex items-center gap-2 mb-6">
      <MessageCircle className="h-5 w-5 text-neutral-600" />
      Discussion ({commentCount})
    </h3>
  );
};

export default CommentsHeader;
