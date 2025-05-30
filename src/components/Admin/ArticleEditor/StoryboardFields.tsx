
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Video, Clock, Image } from 'lucide-react';
import { StoryboardEpisode } from '@/types/ArticleEditorTypes';

interface StoryboardFieldsProps {
  episodes: StoryboardEpisode[];
  onEpisodesChange: (episodes: StoryboardEpisode[]) => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
}

const StoryboardFields: React.FC<StoryboardFieldsProps> = ({
  episodes,
  onEpisodesChange,
  onSubmit,
  isSubmitting = false
}) => {
  const handleAddEpisode = () => {
    const newEpisode: StoryboardEpisode = {
      title: `Episode ${episodes.length + 1}`,
      description: '',
      videoUrl: '',
      thumbnailUrl: '',
      duration: '',
      number: episodes.length + 1,
      content: ''
    };
    
    onEpisodesChange([...episodes, newEpisode]);
  };

  const handleRemoveEpisode = (index: number) => {
    if (episodes.length <= 1) return; // Keep at least one episode
    const newEpisodes = episodes.filter((_, i) => i !== index);
    // Renumber episodes
    const renumberedEpisodes = newEpisodes.map((episode, i) => ({
      ...episode,
      number: i + 1,
      title: episode.title.includes('Episode') ? `Episode ${i + 1}` : episode.title
    }));
    onEpisodesChange(renumberedEpisodes);
  };

  const handleUpdateEpisode = (index: number, field: keyof StoryboardEpisode, value: string) => {
    const newEpisodes = episodes.map((episode, i) => 
      i === index ? { ...episode, [field]: value } : episode
    );
    onEpisodesChange(newEpisodes);
  };

  const formatDuration = (value: string) => {
    // Allow formats like "5:30" or "05:30"
    const cleaned = value.replace(/[^\d:]/g, '');
    if (cleaned.includes(':')) {
      const [minutes, seconds] = cleaned.split(':');
      if (minutes && seconds) {
        return `${minutes.padStart(1, '0')}:${seconds.padStart(2, '0')}`;
      }
    }
    return cleaned;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Episodes</h3>
        <Button
          type="button"
          onClick={handleAddEpisode}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          disabled={isSubmitting}
        >
          <Plus size={16} />
          Add Episode
        </Button>
      </div>

      <div className="space-y-4">
        {episodes.map((episode, index) => (
          <Card key={index} className="border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">
                  Episode {episode.number}
                </CardTitle>
                {episodes.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => handleRemoveEpisode(index)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    disabled={isSubmitting}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`episode-title-${index}`}>Episode Title *</Label>
                <Input
                  id={`episode-title-${index}`}
                  value={episode.title}
                  onChange={(e) => handleUpdateEpisode(index, 'title', e.target.value)}
                  placeholder="Enter episode title"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`episode-description-${index}`}>Description</Label>
                <Textarea
                  id={`episode-description-${index}`}
                  value={episode.description}
                  onChange={(e) => handleUpdateEpisode(index, 'description', e.target.value)}
                  placeholder="Brief description of this episode"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`episode-video-${index}`} className="flex items-center gap-2">
                    <Video size={16} />
                    Video URL
                  </Label>
                  <Input
                    id={`episode-video-${index}`}
                    value={episode.videoUrl}
                    onChange={(e) => handleUpdateEpisode(index, 'videoUrl', e.target.value)}
                    placeholder="https://..."
                    type="url"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`episode-duration-${index}`} className="flex items-center gap-2">
                    <Clock size={16} />
                    Duration
                  </Label>
                  <Input
                    id={`episode-duration-${index}`}
                    value={episode.duration}
                    onChange={(e) => handleUpdateEpisode(index, 'duration', formatDuration(e.target.value))}
                    placeholder="5:30"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`episode-thumbnail-${index}`} className="flex items-center gap-2">
                  <Image size={16} />
                  Thumbnail URL
                </Label>
                <Input
                  id={`episode-thumbnail-${index}`}
                  value={episode.thumbnailUrl}
                  onChange={(e) => handleUpdateEpisode(index, 'thumbnailUrl', e.target.value)}
                  placeholder="https://..."
                  type="url"
                  disabled={isSubmitting}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {episodes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Video size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No episodes yet</p>
          <p className="text-sm">Add your first episode to get started</p>
          <Button
            type="button"
            onClick={handleAddEpisode}
            className="mt-4"
            disabled={isSubmitting}
          >
            <Plus size={16} className="mr-2" />
            Add First Episode
          </Button>
        </div>
      )}
    </div>
  );
};

export default StoryboardFields;
