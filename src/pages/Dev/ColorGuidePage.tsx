
import React, { useState } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { categoryRoutes } from '@/utils/navigation/categoryRoutes';
import { getCategoryColor } from '@/utils/categoryColors';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const ColorGuidePage = () => {
  const [copiedColors, setCopiedColors] = useState<Record<string, boolean>>({});

  // Function to get the appropriate SVG file based on the category name
  const getCategoryIcon = (category: string): string => {
    const categoryMap: Record<string, string> = {
      'Headliners': '/headliners-icon.svg',
      'Debates': '/debates-icon.svg',
      'Spice It Up': '/spice-it-up-icon.svg',
      'Storyboard': '/storyboard-icon.svg',
      'In the Neighborhood': '/neighborhood-icon.svg',
      'Learning': '/learning-icon.svg',
      'School News': '/school-news-icon.svg'
    };
    
    return categoryMap[category] || '/placeholder.svg';
  };

  // Extract Hex value from Tailwind class
  const getHexFromClass = (colorClass: string): string => {
    // This is just for display purposes - in a real app we'd compute actual values
    const colorMap: Record<string, string> = {
      'red': '#F93827',
      'orange': '#F97316',
      'yellow': '#FFCA58',
      'blue': '#0EA5E9', 
      'green': '#10B981',
      'purple': '#8B5CF6',
      'pink': '#D946EF'
    };

    // Parse the color from the class name
    const match = colorClass.match(/bg-flyingbus-(\w+)/);
    const color = match ? match[1] : 'unknown';
    
    return colorMap[color] || '#000000';
  };

  const copyToClipboard = (text: string, categoryName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedColors({...copiedColors, [categoryName]: true});
      toast.success(`Copied ${text} to clipboard!`);
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedColors({...copiedColors, [categoryName]: false});
      }, 2000);
    });
  };

  return (
    <MainLayout>
      <div className="py-6">
        <div className="mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold mb-2">Developer Color Guide</h1>
          <p className="text-gray-500">
            This page is only accessible in development mode and shows all category colors, icons, and related information.
          </p>
          <Badge variant="outline" className="mt-2 bg-yellow-100 text-yellow-800 border-yellow-300">
            Developer Use Only
          </Badge>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Category Colors and Icons</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Hex Value</TableHead>
                  <TableHead>Tailwind Class</TableHead>
                  <TableHead>Icon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryRoutes.map((category) => {
                  const colorClass = getCategoryColor(category.name);
                  const hexValue = getHexFromClass(colorClass);
                  const iconPath = getCategoryIcon(category.name);
                  
                  return (
                    <TableRow key={category.slug}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>{category.slug}</TableCell>
                      <TableCell>
                        <div 
                          className="w-10 h-10 rounded-md border" 
                          style={{ backgroundColor: hexValue }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">{hexValue}</code>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(hexValue, `hex-${category.name}`)}
                          >
                            {copiedColors[`hex-${category.name}`] ? <Check size={16} /> : <Copy size={16} />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">{colorClass}</code>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(colorClass, `class-${category.name}`)}
                          >
                            {copiedColors[`class-${category.name}`] ? <Check size={16} /> : <Copy size={16} />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <img 
                            src={iconPath} 
                            alt={`${category.name} icon`} 
                            className="w-10 h-10 object-contain border rounded p-1"
                          />
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm truncate max-w-[150px]">
                            {iconPath}
                          </code>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How To Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose">
              <h3>Accessing Colors</h3>
              <p>You can use these colors in your components with the following methods:</p>
              <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto">
{`// Using Tailwind classes
<div className="bg-flyingbus-red text-white">Red Background</div>

// Using the utility function
import { getCategoryColor } from '@/utils/categoryColors';
const colorClass = getCategoryColor('Headliners');

// For individual color components 
<div className="text-flyingbus-purple">Purple Text</div>
<div className="border-flyingbus-yellow">Yellow Border</div>`}
              </pre>
              
              <h3 className="mt-4">Working with Icons</h3>
              <p>To use these icons in your components:</p>
              <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto">
{`// In a component
<img src="/headliners-icon.svg" alt="Headliners icon" />

// Using the getCategoryIcon helper
import { getCategoryIcon } from '@/utils/getCategoryIcon';
const IconComponent = getCategoryIcon('Headliners', 24);`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ColorGuidePage;
