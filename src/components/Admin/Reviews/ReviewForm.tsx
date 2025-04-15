
import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { LockIcon } from 'lucide-react';

interface ReviewFormProps {
  onSubmit: (content: string, isPrivate: boolean) => void;
  isSubmitting?: boolean;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ onSubmit, isSubmitting = false }) => {
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (content.trim()) {
      onSubmit(content, isPrivate);
      setContent('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Textarea
          placeholder="Add your feedback for this article..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px] resize-none"
        />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
              id="private-mode"
            />
            <label 
              htmlFor="private-mode" 
              className="text-sm flex items-center cursor-pointer"
            >
              <LockIcon className="h-3 w-3 mr-1" />
              Internal comment only
            </label>
          </div>
          
          <Button 
            type="submit" 
            size="sm"
            disabled={content.trim() === '' || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default ReviewForm;
