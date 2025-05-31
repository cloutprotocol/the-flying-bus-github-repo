
import React from 'react';
import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Video, Clock, Image } from 'lucide-react';
import { StoryboardArticleFormData } from '@/utils/validation/separateFormSchemas';

interface StoryboardFieldsProps {
  form: UseFormReturn<StoryboardArticleFormData>;
  disabled?: boolean;
}

const StoryboardFields: React.FC<StoryboardFieldsProps> = ({
  form,
  disabled = false
}) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "storyboardEpisodes"
  });

  const handleAddEpisode = () => {
    append({
      title: `Episode ${fields.length + 1}`,
      description: '',
      videoUrl: '',
      thumbnailUrl: '',
      duration: '',
      number: fields.length + 1,
      content: ''
    });
  };

  const handleRemoveEpisode = (index: number) => {
    if (fields.length <= 1) return;
    remove(index);
    
    // Renumber remaining episodes
    const currentValues = form.getValues('storyboardEpisodes');
    const renumberedEpisodes = currentValues.map((episode, i) => ({
      ...episode,
      number: i + 1,
      title: episode.title.includes('Episode') ? `Episode ${i + 1}` : episode.title
    }));
    form.setValue('storyboardEpisodes', renumberedEpisodes);
  };

  const formatDuration = (value: string) => {
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
          disabled={disabled}
        >
          <Plus size={16} />
          Add Episode
        </Button>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <Card key={field.id} className="border border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">
                  Episode {index + 1}
                </CardTitle>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => handleRemoveEpisode(index)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    disabled={disabled}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name={`storyboardEpisodes.${index}.title`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Episode Title *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter episode title"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`storyboardEpisodes.${index}.description`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Brief description of this episode"
                        rows={3}
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`storyboardEpisodes.${index}.videoUrl`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Video size={16} />
                        Video URL
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://..."
                          type="url"
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`storyboardEpisodes.${index}.duration`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Clock size={16} />
                        Duration
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(e) => field.onChange(formatDuration(e.target.value))}
                          placeholder="5:30"
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name={`storyboardEpisodes.${index}.thumbnailUrl`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Image size={16} />
                      Thumbnail URL
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="https://..."
                        type="url"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {fields.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Video size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No episodes yet</p>
          <p className="text-sm">Add your first episode to get started</p>
          <Button
            type="button"
            onClick={handleAddEpisode}
            className="mt-4"
            disabled={disabled}
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
