
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { Image, Upload } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';

interface MediaSelectorProps {
  form: UseFormReturn<any>;
}

const MediaSelector: React.FC<MediaSelectorProps> = ({ form }) => {
  const [previewImage, setPreviewImage] = useState('');
  
  // This would be expanded in a real app to handle actual file uploads
  const handleImageUrlChange = (url: string) => {
    setPreviewImage(url);
    form.setValue('imageUrl', url);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Featured Media</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Featured Image URL</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter image URL" 
                  {...field} 
                  onChange={(e) => {
                    field.onChange(e);
                    handleImageUrlChange(e.target.value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Image preview */}
        {previewImage ? (
          <div className="rounded-md overflow-hidden border bg-muted">
            <AspectRatio ratio={16/9}>
              <img 
                src={previewImage} 
                alt="Preview" 
                className="object-cover w-full h-full"
                onError={() => setPreviewImage('')}
              />
            </AspectRatio>
          </div>
        ) : (
          <div className="rounded-md overflow-hidden border bg-muted flex items-center justify-center h-[150px]">
            <div className="text-center text-muted-foreground">
              <Image className="h-10 w-10 mx-auto mb-2 text-muted-foreground/60" />
              <p className="text-sm">Image preview</p>
            </div>
          </div>
        )}
        
        {/* This button would open a media gallery in a real implementation */}
        <Button variant="outline" className="w-full" type="button">
          <Upload className="mr-2 h-4 w-4" />
          Upload Image
        </Button>
      </CardContent>
    </Card>
  );
};

export default MediaSelector;
