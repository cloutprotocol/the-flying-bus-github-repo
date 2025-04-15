
import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Video, Trash } from 'lucide-react';

interface MediaItem {
  id: string;
  url: string;
  title: string;
  type: string;
  date: string;
}

interface MediaListProps {
  media: MediaItem[];
  selectedMedia: string[];
  onMediaSelect: (id: string) => void;
}

const MediaList: React.FC<MediaListProps> = ({
  media,
  selectedMedia,
  onMediaSelect
}) => {
  return (
    <div className="divide-y">
      {media.map(item => (
        <div 
          key={item.id}
          className={`flex items-center py-3 ${
            selectedMedia.includes(item.id) ? 'bg-muted/50' : ''
          }`}
        >
          <div className="pl-2 pr-4">
            <Checkbox 
              checked={selectedMedia.includes(item.id)}
              onCheckedChange={() => onMediaSelect(item.id)}
            />
          </div>
          
          <div className="w-16 h-16 rounded overflow-hidden mr-4">
            {item.type === 'image' ? (
              <img 
                src={item.url} 
                alt={item.title} 
                className="object-cover w-full h-full" 
              />
            ) : (
              <div className="bg-blue-100 h-full flex items-center justify-center">
                <Video className="h-8 w-8 text-blue-500" />
              </div>
            )}
          </div>
          
          <div className="flex-grow">
            <p className="font-medium">{item.title}</p>
            <p className="text-sm text-muted-foreground">
              {item.type === 'image' ? 'Image' : 'Video'} • {item.date}
            </p>
          </div>
          
          <div className="pr-4">
            <Button variant="ghost" size="icon">
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MediaList;
