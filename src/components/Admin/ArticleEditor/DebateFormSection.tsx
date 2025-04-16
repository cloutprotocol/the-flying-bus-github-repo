
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RichTextEditor from './RichTextEditor';
import { UseFormReturn } from 'react-hook-form';

interface DebateFormSectionProps {
  form: UseFormReturn<any>;
  content: string;
  setContent: (content: string) => void;
}

const DebateFormSection: React.FC<DebateFormSectionProps> = ({ 
  form,
  content, 
  setContent 
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Debate Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="yes">
          <TabsList className="mb-4">
            <TabsTrigger value="yes">Yes Argument</TabsTrigger>
            <TabsTrigger value="no">No Argument</TabsTrigger>
          </TabsList>
          <TabsContent value="yes">
            <RichTextEditor 
              value={content} 
              onChange={setContent} 
              placeholder="Write arguments supporting the 'Yes' position..."
            />
          </TabsContent>
          <TabsContent value="no">
            <RichTextEditor 
              value={content} 
              onChange={setContent} 
              placeholder="Write arguments supporting the 'No' position..."
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DebateFormSection;
