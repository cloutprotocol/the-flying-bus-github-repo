
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, BookOpen, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { ReaderProfile, PrivacySettings } from '@/types/ReaderProfile';

interface ActivityItem {
  id: string;
  type: 'comment' | 'article_read';
  title: string;
  excerpt?: string;
  date: string;
  category?: string;
}

interface ProfileActivityProps {
  profile: ReaderProfile;
  privacySettings: PrivacySettings | null;
}

const ProfileActivity = ({ profile, privacySettings }: ProfileActivityProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivity();
  }, [profile.id, privacySettings]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const allActivities: ActivityItem[] = [];

      // Fetch recent comments if allowed
      if (privacySettings?.show_comment_history !== false) {
        const { data: comments } = await supabase
          .from('comments')
          .select(`
            id,
            content,
            created_at,
            article_id
          `)
          .eq('user_id', profile.id)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(10);

        if (comments) {
          for (const comment of comments) {
            allActivities.push({
              id: comment.id,
              type: 'comment',
              title: 'Left a comment',
              excerpt: comment.content.length > 100 
                ? comment.content.substring(0, 100) + '...' 
                : comment.content,
              date: comment.created_at,
            });
          }
        }
      }

      // Sort all activities by date
      allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setActivities(allActivities.slice(0, 20)); // Show latest 20 activities
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading activity...</div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Activity className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Recent Activity</h3>
          <p className="text-muted-foreground">
            This user hasn't been active recently or has their activity set to private.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4 p-4 rounded-lg border bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex-shrink-0 mt-1">
                {activity.type === 'comment' ? (
                  <MessageCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <BookOpen className="h-5 w-5 text-blue-600" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{activity.title}</span>
                  {activity.category && (
                    <Badge variant="secondary" className="text-xs">
                      {activity.category}
                    </Badge>
                  )}
                </div>
                
                {activity.excerpt && (
                  <p className="text-sm text-muted-foreground mb-2">
                    "{activity.excerpt}"
                  </p>
                )}
                
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDate(activity.date)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileActivity;
