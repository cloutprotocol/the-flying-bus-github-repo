
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, MessageCircle, Trophy, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { ReaderProfile, PrivacySettings, UserReadingStats } from '@/types/ReaderProfile';

interface ProfileStatsProps {
  profile: ReaderProfile;
  privacySettings: PrivacySettings | null;
}

const ProfileStats = ({ profile, privacySettings }: ProfileStatsProps) => {
  const [readingStats, setReadingStats] = useState<UserReadingStats | null>(null);
  const [commentCount, setCommentCount] = useState(0);
  const [achievementCount, setAchievementCount] = useState(0);

  useEffect(() => {
    fetchStats();
  }, [profile.id]);

  const fetchStats = async () => {
    try {
      // Fetch reading stats
      if (privacySettings?.show_reading_activity !== false) {
        const { data: readingData } = await supabase
          .from('user_reading_stats')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle();
        
        setReadingStats(readingData);
      }

      // Fetch comment count
      if (privacySettings?.show_comment_history !== false) {
        const { count } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('status', 'published');
        
        setCommentCount(count || 0);
      }

      // Fetch achievement count
      if (privacySettings?.show_achievements !== false) {
        const { count } = await supabase
          .from('user_achievements')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id);
        
        setAchievementCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const stats = [
    {
      title: 'Articles Read',
      value: readingStats?.articles_read || 0,
      icon: BookOpen,
      color: 'from-blue-500 to-blue-600',
      show: privacySettings?.show_reading_activity !== false,
    },
    {
      title: 'Reading Streak',
      value: `${readingStats?.reading_streak || 0} days`,
      icon: Flame,
      color: 'from-orange-500 to-red-500',
      show: privacySettings?.show_reading_activity !== false,
    },
    {
      title: 'Comments',
      value: commentCount,
      icon: MessageCircle,
      color: 'from-green-500 to-green-600',
      show: privacySettings?.show_comment_history !== false,
    },
    {
      title: 'Achievements',
      value: achievementCount,
      icon: Trophy,
      color: 'from-purple-500 to-purple-600',
      show: privacySettings?.show_achievements !== false,
    },
  ];

  const visibleStats = stats.filter(stat => stat.show);

  if (visibleStats.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {visibleStats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="overflow-hidden">
            <CardHeader className={`bg-gradient-to-r ${stat.color} text-white pb-2`}>
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Icon className="h-4 w-4" />
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-center">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ProfileStats;
