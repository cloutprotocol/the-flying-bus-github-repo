
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import ProfilePictureUpload from '@/components/ui/ProfilePictureUpload';
import { useAuth } from '@/hooks/useAuth';
import { updateProfile } from '@/services/settingsService';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';

interface ProfileFormData {
  username: string;
  display_name: string;
  bio: string;
  public_bio: string;
  avatar_url: string;
  favorite_categories: string[];
}

const AVAILABLE_CATEGORIES = [
  'headliners',
  'debates', 
  'learning',
  'neighborhood',
  'school-news',
  'spice-it-up',
  'storyboard'
];

const UserProfileSettings = () => {
  const { currentUser, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  const form = useForm<ProfileFormData>({
    defaultValues: {
      username: currentUser?.username || '',
      display_name: currentUser?.display_name || '',
      bio: currentUser?.bio || '',
      public_bio: currentUser?.public_bio || '',
      avatar_url: currentUser?.avatar_url || '',
      favorite_categories: currentUser?.favorite_categories || [],
    },
  });

  useEffect(() => {
    if (currentUser) {
      setSelectedCategories(currentUser.favorite_categories || []);
      form.reset({
        username: currentUser.username || '',
        display_name: currentUser.display_name || '',
        bio: currentUser.bio || '',
        public_bio: currentUser.public_bio || '',
        avatar_url: currentUser.avatar_url || '',
        favorite_categories: currentUser.favorite_categories || [],
      });
    }
  }, [currentUser, form]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      
      await updateProfile(currentUser.id, {
        username: data.username,
        display_name: data.display_name,
        bio: data.bio,
        public_bio: data.public_bio,
        avatar_url: data.avatar_url,
        favorite_categories: selectedCategories,
      });
      
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

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

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
          name="public_bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Public Bio</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Tell everyone about yourself..."
                  className="min-h-[80px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Private Bio</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Private notes about yourself (only visible to you)..."
                  className="min-h-[80px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3">
          <FormLabel>Favorite Categories</FormLabel>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_CATEGORIES.map((category) => (
              <Badge
                key={category}
                variant={selectedCategories.includes(category) ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => toggleCategory(category)}
              >
                {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
                {selectedCategories.includes(category) && (
                  <X className="ml-1 h-3 w-3" />
                )}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Select your favorite article categories to personalize your experience
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default UserProfileSettings;
