import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const FormFieldVisibilityTest: React.FC = () => {
  return (
    <Card className="m-4 max-w-md">
      <CardHeader>
        <CardTitle>Form Field Visibility Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Input Field:</label>
          <Input placeholder="This should have white background" />
        </div>
        
        <div>
          <label className="text-sm font-medium">Textarea:</label>
          <Textarea placeholder="This should also have white background" />
        </div>
        
        <div>
          <label className="text-sm font-medium">Select:</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Button variant="default">Default Button</Button>
          <Button variant="outline">Outline Button</Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          All form fields above should have white backgrounds for better visibility against the page background.
        </div>
      </CardContent>
    </Card>
  );
};

export default FormFieldVisibilityTest;