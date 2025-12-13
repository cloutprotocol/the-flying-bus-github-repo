
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, MessageCircle, Trophy, Flame } from 'lucide-react';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
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
      const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
      // Comments via Convex
      if (privacySettings?.show_comment_history !== false) {
        const comments = await convex.query(api.comments.getByUser, { userId: profile.id as any as Id<'profiles'> });
        setCommentCount((comments || []).length);
      }
      // Reading stats and achievements not in Convex schema yet; default to 0
      if (privacySettings?.show_reading_activity !== false) setReadingStats({} as any);
      if (privacySettings?.show_achievements !== false) setAchievementCount(0);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const stats = [
    {
      title: 'Articles Read',
      value: readingStats?.articles_read || 0,
      icon: BookOpen,
      color: 'bg-blue-500',
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      show: privacySettings?.show_reading_activity !== false,
    },
    {
      title: 'Reading Streak',
      value: `${readingStats?.reading_streak || 0} days`,
      icon: Flame,
      color: 'bg-orange-500',
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      show: privacySettings?.show_reading_activity !== false,
    },
    {
      title: 'Comments',
      value: commentCount,
      icon: MessageCircle,
      color: 'bg-green-500',
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
      show: privacySettings?.show_comment_history !== false,
    },
    {
      title: 'Achievements',
      value: achievementCount,
      icon: Trophy,
      color: 'bg-purple-500',
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
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
          <Card key={index} className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ProfileStats;
