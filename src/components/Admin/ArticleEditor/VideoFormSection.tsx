
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { UseFormReturn } from 'react-hook-form';

interface VideoFormSectionProps {
  form: UseFormReturn<any>;
}

const VideoFormSection: React.FC<VideoFormSectionProps> = ({ form }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Video Content</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="form-group">
          <FormLabel>Video URL</FormLabel>
          <Input 
            placeholder="Enter YouTube or Vimeo URL" 
            onChange={(e) => {
              // Store in form data
              const formData = form.getValues();
              formData.videoUrl = e.target.value;
            }} 
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoFormSection;
