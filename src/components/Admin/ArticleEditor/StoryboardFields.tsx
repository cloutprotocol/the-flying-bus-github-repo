
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { UseFormReturn } from 'react-hook-form';
import { PlusCircle, Trash2 } from 'lucide-react';

interface StoryboardFieldsProps {
  form: UseFormReturn<any>;
  isNewSeries: boolean;
}

const StoryboardFields: React.FC<StoryboardFieldsProps> = ({ 
  form, 
  isNewSeries = true 
}) => {
  const [episodes, setEpisodes] = useState<Array<{ title: string, number: number }>>([
    { title: '', number: 1 }
  ]);
  
  const addEpisode = () => {
    setEpisodes([...episodes, { title: '', number: episodes.length + 1 }]);
  };
  
  const removeEpisode = (index: number) => {
    if (episodes.length > 1) {
      const newEpisodes = [...episodes];
      newEpisodes.splice(index, 1);
      // Renumber episodes
      const renumbered = newEpisodes.map((ep, idx) => ({
        ...ep,
        number: idx + 1
      }));
      setEpisodes(renumbered);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Storyboard Series</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isNewSeries ? (
          <>
            <FormField
              control={form.control}
              name="seriesTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Series Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter series title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="seriesDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Series Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter series description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : (
          <FormField
            control={form.control}
            name="seriesId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Series</FormLabel>
                <Select 
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select series" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="series1">The Adventures of Sam</SelectItem>
                    <SelectItem value="series2">Space Explorers</SelectItem>
                    <SelectItem value="series3">Mystery at Green Lake</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium">Episodes</h4>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={addEpisode}
              type="button"
            >
              <PlusCircle className="mr-1 h-4 w-4" />
              Add Episode
            </Button>
          </div>
          
          <div className="space-y-3">
            {episodes.map((episode, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-12">
                  <Input
                    type="number"
                    value={episode.number}
                    onChange={(e) => {
                      const newEpisodes = [...episodes];
                      newEpisodes[index].number = parseInt(e.target.value);
                      setEpisodes(newEpisodes);
                    }}
                    className="text-center"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="Episode title"
                    value={episode.title}
                    onChange={(e) => {
                      const newEpisodes = [...episodes];
                      newEpisodes[index].title = e.target.value;
                      setEpisodes(newEpisodes);
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEpisode(index)}
                  disabled={episodes.length === 1}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StoryboardFields;
