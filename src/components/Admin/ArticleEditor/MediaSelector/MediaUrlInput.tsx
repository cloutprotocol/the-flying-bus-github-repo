
import React from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { UseFormReturn } from 'react-hook-form';

interface MediaUrlInputProps {
  form: UseFormReturn<any>;
  previewMedia: string;
  isVideo: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const MediaUrlInput: React.FC<MediaUrlInputProps> = ({ 
  form, 
  previewMedia, 
  isVideo, 
  onChange 
}) => {
  return (
    <FormField
      control={form.control}
      name={isVideo ? 'videoUrl' : 'imageUrl'}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Media URL</FormLabel>
          <FormControl>
            <Input 
              placeholder="Enter media URL" 
              value={previewMedia}
              onChange={onChange}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default MediaUrlInput;
