
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { UseFormReturn } from 'react-hook-form';

interface DebateFormSectionProps {
  form: UseFormReturn<any>;
}

const DebateFormSection: React.FC<DebateFormSectionProps> = ({ form }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Debate Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="question"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Debate Question</FormLabel>
              <FormControl>
                <Input 
                  placeholder="What is the main question for this debate?" 
                  {...field}
                />
              </FormControl>
              <FormDescription>
                This will be the main question that readers will vote on.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Tabs defaultValue="yes" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="yes">Yes Position</TabsTrigger>
            <TabsTrigger value="no">No Position</TabsTrigger>
          </TabsList>
          
          <TabsContent value="yes" className="mt-4">
            <FormField
              control={form.control}
              name="yesPosition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arguments Supporting "Yes"</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Write arguments supporting the 'Yes' position..."
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Present compelling arguments for the "Yes" side of the debate.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
          
          <TabsContent value="no" className="mt-4">
            <FormField
              control={form.control}
              name="noPosition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arguments Supporting "No"</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Write arguments supporting the 'No' position..."
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Present compelling arguments for the "No" side of the debate.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>

        <div className="flex items-center space-x-2">
          <FormField
            control={form.control}
            name="votingEnabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Enable Voting</FormLabel>
                  <FormDescription>
                    Allow readers to vote on this debate question.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default DebateFormSection;
