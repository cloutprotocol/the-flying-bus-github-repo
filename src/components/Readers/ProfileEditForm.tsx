
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Save, AlertCircle } from 'lucide-react';
import { ReaderProfile } from '@/types/ReaderProfile';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import PrivacySettingsSection from './PrivacySettingsSection';

// Define the form schema with zod
const profileFormSchema = z.object({
  display_name: z.string().min(2, { message: "Display name must be at least 2 characters." }),
  username: z.string().min(3, { message: "Username must be at least 3 characters." })
    .regex(/^[a-z0-9_]+$/, { message: "Username can only contain lowercase letters, numbers, and underscores." }),
  bio: z.string().max(250, { message: "Bio must not exceed 250 characters." }).optional(),
  showCommentHistory: z.boolean().default(false),
  showReadingActivity: z.boolean().default(false),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileEditFormProps {
  profile: ReaderProfile;
  editedProfile: ReaderProfile;
  isSubmitting: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onPrivacyChange: (field: string, value: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({
  profile,
  editedProfile,
  isSubmitting,
  onSubmit: onFormSubmit,
}) => {
  const navigate = useNavigate();
  
  // Initialize the form with react-hook-form
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      display_name: editedProfile.display_name,
      username: editedProfile.username,
      bio: editedProfile.bio || '',
      showCommentHistory: false,
      showReadingActivity: false,
    },
  });

  // Handle form submission
  const onSubmit = (values: ProfileFormValues) => {
    const formEvent = { preventDefault: () => {} } as React.FormEvent;
    // Update the editedProfile with form values
    editedProfile.display_name = values.display_name;
    editedProfile.username = values.username;
    editedProfile.bio = values.bio;
    
    // Call the original onSubmit function
    onFormSubmit(formEvent);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-24 px-4">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-center text-xl">Edit Your Profile</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid gap-6">
              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="border-gray-200" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          {...field} 
                          className="border-gray-200" 
                        />
                      </FormControl>
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <AlertCircle className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      Username can only be changed once every 30 days.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
                        rows={4}
                        className="border-gray-200 resize-none"
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500 text-right">
                      {field.value?.length || 0}/250
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Separator className="bg-gray-100" />
            
            <PrivacySettingsSection 
              control={form.control}
            />
          </CardContent>
          
          <CardFooter className="flex justify-end pb-6 gap-3">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => navigate(`/profile/${profile.username}`)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex gap-2 items-center bg-purple-600 hover:bg-purple-700"
              disabled={isSubmitting}
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
};

export default ProfileEditForm;
