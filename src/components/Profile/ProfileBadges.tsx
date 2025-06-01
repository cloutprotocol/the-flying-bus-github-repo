
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Award, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { ReaderProfile, PrivacySettings, Achievement, AchievementType } from '@/types/ReaderProfile';

interface ProfileBadgesProps {
  profile: ReaderProfile;
  privacySettings: PrivacySettings | null;
}

const ProfileBadges = ({ profile, privacySettings }: ProfileBadgesProps) => {
  const [achievements, setAchievements] = useState<(Achievement & { type: AchievementType })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
  }, [profile.id, privacySettings]);

  const fetchAchievements = async () => {
    try {
      setLoading(true);

      if (privacySettings?.show_achievements !== false) {
        const { data: userAchievements } = await supabase
          .from('user_achievements')
          .select(`
            *,
            achievement_types!inner(*)
          `)
          .eq('user_id', profile.id)
          .order('achieved_at', { ascending: false });

        if (userAchievements) {
          const formattedAchievements = userAchievements.map(achievement => ({
            ...achievement,
            type: achievement.achievement_types
          }));
          setAchievements(formattedAchievements);
        }
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading badges...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Future Crypto Badges Section - Placeholder */}
      {privacySettings?.show_badges !== false && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Badges & Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full p-6 mb-4">
                <Trophy className="h-12 w-12 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Badges Yet!</h3>
              <p className="text-muted-foreground max-w-md">
                Start reading articles and participating in discussions to earn special badges and rewards! 
                More exciting badge features coming soon.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievement Section */}
      {privacySettings?.show_achievements !== false && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-600" />
              Achievements ({achievements.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {achievements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-full p-6 mb-4">
                  <Award className="h-12 w-12 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Achievements Yet!</h3>
                <p className="text-muted-foreground">
                  Keep reading and commenting to unlock your first achievement!
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {achievements.map((achievement) => (
                  <div 
                    key={achievement.id} 
                    className="flex items-start gap-4 p-4 rounded-lg border bg-gradient-to-r from-purple-50 to-pink-50"
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg">
                        {achievement.type.icon || '🏆'}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{achievement.type.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {achievement.type.category}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {achievement.type.description}
                      </p>
                      
                      <div className="text-xs text-muted-foreground">
                        Earned on {formatDate(achievement.achieved_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProfileBadges;
