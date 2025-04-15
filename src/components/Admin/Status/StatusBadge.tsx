
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Check, XCircle, Archive, EyeOff } from 'lucide-react';

export type StatusType = 'draft' | 'pending' | 'published' | 'rejected' | 'archived';

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'default';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'default' }) => {
  const statusConfig = {
    draft: {
      label: 'Draft',
      color: 'bg-yellow-100 hover:bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: <EyeOff className="h-3.5 w-3.5 mr-1" />
    },
    pending: {
      label: 'Pending Review',
      color: 'bg-blue-100 hover:bg-blue-100 text-blue-800 border-blue-200',
      icon: <Clock className="h-3.5 w-3.5 mr-1" />
    },
    published: {
      label: 'Published',
      color: 'bg-green-100 hover:bg-green-100 text-green-800 border-green-200',
      icon: <Check className="h-3.5 w-3.5 mr-1" />
    },
    rejected: {
      label: 'Rejected',
      color: 'bg-red-100 hover:bg-red-100 text-red-800 border-red-200',
      icon: <XCircle className="h-3.5 w-3.5 mr-1" />
    },
    archived: {
      label: 'Archived',
      color: 'bg-gray-100 hover:bg-gray-100 text-gray-800 border-gray-200',
      icon: <Archive className="h-3.5 w-3.5 mr-1" />
    }
  };

  const { label, color, icon } = statusConfig[status];
  const sizeClass = size === 'sm' ? 'text-xs py-0 px-2' : 'text-xs py-1 px-2';

  return (
    <Badge variant="outline" className={`${color} ${sizeClass} flex items-center font-medium`}>
      {icon}
      {label}
    </Badge>
  );
};

export default StatusBadge;
