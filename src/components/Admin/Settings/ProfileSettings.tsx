
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { updateProfile } from '@/services/settingsService';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';

interface ProfileFormData {
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
}

const ProfileSettings = () => {
  const { currentUser, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<ProfileFormData>({
    defaultValues: {
      username: currentUser?.username || '',
      displayName: currentUser?.displayName || '',
      bio: currentUser?.bio || '',
      avatar: currentUser?.avatar || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      
      await updateProfile(currentUser.id, {
        username: data.username,
        display_name: data.displayName,
        bio: data.bio,
        avatar_url: data.avatar,
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
        displayName: currentUser.displayName || '',
        bio: currentUser.bio || '',
        avatar: currentUser.avatar || '',
      });
    }
  }, [currentUser, form]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center gap-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={form.watch('avatar')} alt={currentUser?.displayName} />
            <AvatarFallback className="bg-neutral-700 text-white text-lg">
              {getInitials(currentUser?.displayName || 'User')}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="avatar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avatar URL</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        {...field}
                        placeholder="https://example.com/avatar.jpg"
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" size="icon">
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
            name="displayName"
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
