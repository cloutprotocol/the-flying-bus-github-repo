
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import ProfilePictureUpload from '@/components/ui/ProfilePictureUpload';
import { useAuth } from '@/hooks/useAuth';
import { updateProfile } from '@/services/settingsService';
import { useToast } from '@/hooks/use-toast';

interface ProfileFormData {
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
}

const ProfileSettings = () => {
  const { currentUser, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<ProfileFormData>({
    defaultValues: {
      username: currentUser?.username || '',
      display_name: currentUser?.display_name || '',
      bio: currentUser?.bio || '',
      avatar_url: currentUser?.avatar_url || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      
      await updateProfile(currentUser.id, {
        username: data.username,
        display_name: data.display_name,
        bio: data.bio,
        avatar_url: data.avatar_url,
      });
      
      // Refresh the user profile to get the latest data
      const refreshSuccess = await refreshUserProfile();
      
      if (refreshSuccess) {
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully.",
        });
      } else {
        toast({
          title: "Profile updated",
          description: "Your profile has been updated, but there was an issue refreshing the display. Please refresh the page.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update form values when currentUser changes (after refresh)
  React.useEffect(() => {
    if (currentUser) {
      form.reset({
        username: currentUser.username || '',
        display_name: currentUser.display_name || '',
        bio: currentUser.bio || '',
        avatar_url: currentUser.avatar_url || '',
      });
    }
  }, [currentUser, form]);

  const handleAvatarUpload = (newAvatarUrl: string) => {
    form.setValue('avatar_url', newAvatarUrl);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <ProfilePictureUpload
            currentAvatarUrl={form.watch('avatar_url')}
            displayName={currentUser?.display_name}
            userId={currentUser?.id || ''}
            onUploadSuccess={handleAvatarUpload}
          />
          
          <FormField
            control={form.control}
            name="avatar_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Avatar URL (Optional)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="https://example.com/avatar.jpg"
                    className="flex-1"
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground">
                  You can also paste a direct image URL here instead of uploading
                </p>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="username" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Your display name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Tell us about yourself..."
                  className="min-h-[100px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ProfileSettings;
