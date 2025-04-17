
import React from 'react';
import { 
  FileEdit, 
  MessageSquare, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Eye 
} from 'lucide-react';

interface ActivityIconProps {
  type: string;
  className?: string;
}

const ActivityIcon: React.FC<ActivityIconProps> = ({ type, className = "w-4 h-4" }) => {
  switch (type) {
    case 'article_created':
      return <FileText className={className} />;
    case 'article_updated':
      return <FileEdit className={className} />;
    case 'article_published':
      return <Eye className={className} />;
    case 'comment_added':
    case 'comment_edited':
    case 'comment_deleted':
      return <MessageSquare className={className} />;
    case 'article_approved':
      return <CheckCircle2 className={className} />;
    case 'article_rejected':
      return <XCircle className={className} />;
    default:
      return null;
  }
};

export default ActivityIcon;
