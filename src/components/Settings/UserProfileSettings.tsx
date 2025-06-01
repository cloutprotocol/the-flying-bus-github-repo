
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { updateProfile } from '@/services/settingsService';
import { useToast } from '@/hooks/use-toast';
import { Upload, X } from 'lucide-react';

interface ProfileFormData {
  username: string;
  displayName: string;
  bio: string;
  publicBio: string;
  avatar: string;
  favoriteCategories: string[];
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
      displayName: currentUser?.displayName || '',
      bio: currentUser?.bio || '',
      publicBio: currentUser?.public_bio || '',
      avatar: currentUser?.avatar || '',
      favoriteCategories: currentUser?.favorite_categories || [],
    },
  });

  useEffect(() => {
    if (currentUser) {
      setSelectedCategories(currentUser.favorite_categories || []);
      form.reset({
        username: currentUser.username || '',
        displayName: currentUser.displayName || '',
        bio: currentUser.bio || '',
        publicBio: currentUser.public_bio || '',
        avatar: currentUser.avatar || '',
        favoriteCategories: currentUser.favorite_categories || [],
      });
    }
  }, [currentUser, form]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      
      await updateProfile(currentUser.id, {
        username: data.username,
        display_name: data.displayName,
        bio: data.bio,
        public_bio: data.publicBio,
        avatar_url: data.avatar,
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
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-lg">
              {getInitials(currentUser?.displayName || 'User')}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-2 flex-1">
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
          name="publicBio"
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
