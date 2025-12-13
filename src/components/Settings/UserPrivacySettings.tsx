
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { PrivacySettings } from '@/types/ReaderProfile';

interface PrivacyFormData {
  profileVisibility: 'public' | 'private';
  showReadingActivity: boolean;
  showCommentHistory: boolean;
  showBadges: boolean;
  showAchievements: boolean;
}

const UserPrivacySettings = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  
  const form = useForm<PrivacyFormData>({
    defaultValues: {
      profileVisibility: 'public',
      showReadingActivity: true,
      showCommentHistory: true,
      showBadges: true,
      showAchievements: true,
    },
  });

  const settings = useQuery(
    api.privacy.getByUser,
    currentUser ? { userId: currentUser.id as any } : 'skip'
  );
  const upsert = useMutation(api.privacy.upsert);
  useEffect(() => {
    if (!currentUser) return;
    if (settings === undefined) return;
    if (!settings) return;
    const transformedData: PrivacySettings = {
      user_id: settings.user_id as any,
      profile_visibility: settings.profile_visibility as any,
      show_reading_activity: (settings as any).show_reading_history ?? true,
      show_comment_history: true,
      show_badges: true,
      show_achievements: false,
      updated_at: settings.updated_at,
    };
    setPrivacySettings(transformedData);
    form.reset({
      profileVisibility: transformedData.profile_visibility,
      showReadingActivity: transformedData.show_reading_activity,
      showCommentHistory: transformedData.show_comment_history,
      showBadges: transformedData.show_badges,
      showAchievements: transformedData.show_achievements,
    });
  }, [currentUser, settings]);

  const onSubmit = async (data: PrivacyFormData) => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      
      const updateData = {
        profile_visibility: data.profileVisibility,
        show_reading_activity: data.showReadingActivity,
        show_comment_history: data.showCommentHistory,
        show_badges: data.showBadges,
        show_achievements: data.showAchievements,
        updated_at: new Date().toISOString(),
      };

      await upsert({
        userId: currentUser.id as any,
        profile_visibility: data.profileVisibility,
        show_reading_history: data.showReadingActivity,
        allow_comments: data.showCommentHistory,
        email_notifications: data.showBadges, // approximate mapping
      });
      
      toast({
        title: "Privacy settings updated",
        description: "Your privacy preferences have been saved successfully.",
      });
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      toast({
        title: "Update failed",
        description: "Failed to update privacy settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="profileVisibility"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profile Visibility</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select profile visibility" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="public">Public - Anyone can view your profile</SelectItem>
                  <SelectItem value="private">Private - Only you can view your profile</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Control who can see your public profile page
              </FormDescription>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="showReadingActivity"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Show Reading Activity</FormLabel>
                <FormDescription>
                  Display your reading stats and recent articles on your profile
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="showCommentHistory"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Show Comment History</FormLabel>
                <FormDescription>
                  Display your recent comments and discussions on your profile
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="showBadges"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Show Badges</FormLabel>
                <FormDescription>
                  Display earned badges and rewards on your profile
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="showAchievements"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Show Achievements</FormLabel>
                <FormDescription>
                  Display your reading achievements and milestones
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Privacy Settings'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default UserPrivacySettings;
