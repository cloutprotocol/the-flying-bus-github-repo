
import React from 'react';
import { format } from 'date-fns';
import { Activity } from '@/services/activityService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ActivityIcon from './ActivityIcon';

interface ActivityFeedProps {
  activities: Activity[];
  isLoading?: boolean;
}

const getActivityDescription = (activity: Activity) => {
  const metadata = activity.metadata || {};
  
  switch (activity.activity_type) {
    case 'article_created':
      return `created article "${metadata.title}"`;
    case 'article_published':
      return `published article "${metadata.title}"`;
    case 'comment_added':
      return `commented on an article: "${metadata.content}..."`;
    default:
      return activity.activity_type.replace(/_/g, ' ');
  }
};

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="text-center py-6 text-gray-500">
        No recent activity to display
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-3 items-start">
          <Avatar className="w-10 h-10">
            <AvatarImage 
              src={activity.profiles?.avatar_url} 
              alt={activity.profiles?.display_name || ''} 
            />
            <AvatarFallback>
              {(activity.profiles?.display_name || 'U')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <ActivityIcon type={activity.activity_type} />
              <span className="font-medium">
                {activity.profiles?.display_name}
              </span>
              <span className="text-gray-600">
                {getActivityDescription(activity)}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityFeed;
