
import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, MessageSquare, TrendingUp, TrendingDown } from 'lucide-react';

interface PopularContentTableProps {
  dateRange: string;
}

const PopularContentTable: React.FC<PopularContentTableProps> = ({ dateRange }) => {
  // Mock data for popular content
  const popularContent = [
    {
      id: '1',
      title: 'The Future of Ocean Conservation',
      category: 'Headliners',
      views: 3245,
      comments: 87,
      engagement: '24.3%',
      trend: 'up',
    },
    {
      id: '2',
      title: 'Should Video Games Be Taught in Schools?',
      category: 'Debates',
      views: 2876,
      comments: 124,
      engagement: '28.7%',
      trend: 'up',
    },
    {
      id: '3',
      title: 'How Plants Communicate',
      category: 'Learning',
      views: 2540,
      comments: 63,
      engagement: '18.5%',
      trend: 'down',
    },
    {
      id: '4',
      title: 'Interview with a Young Chef',
      category: 'Spice It Up',
      views: 2187,
      comments: 42,
      engagement: '15.2%',
      trend: 'up',
    },
    {
      id: '5',
      title: 'The Mystery of the Missing Library Book: Part 1',
      category: 'Storyboard',
      views: 1986,
      comments: 56,
      engagement: '19.8%',
      trend: 'down',
    },
    {
      id: '6',
      title: 'Our School\'s New Recycling Program',
      category: 'School News',
      views: 1845,
      comments: 34,
      engagement: '14.7%',
      trend: 'up',
    },
  ];

  // In a real app, we would adjust data based on dateRange
  // For simplicity, we'll use the same data for all ranges here

  const getCategoryBadge = (category: string) => {
    const categoryStyles: Record<string, string> = {
      'Headliners': 'bg-blue-100 text-blue-800 border-blue-200',
      'Debates': 'bg-purple-100 text-purple-800 border-purple-200',
      'Spice It Up': 'bg-orange-100 text-orange-800 border-orange-200',
      'Learning': 'bg-green-100 text-green-800 border-green-200',
      'Storyboard': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'School News': 'bg-red-100 text-red-800 border-red-200',
      'Neighborhood': 'bg-teal-100 text-teal-800 border-teal-200',
    };

    return (
      <Badge variant="outline" className={categoryStyles[category] || 'bg-gray-100 text-gray-800 border-gray-200'}>
        {category}
      </Badge>
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Views</TableHead>
          <TableHead>Comments</TableHead>
          <TableHead>Engagement</TableHead>
          <TableHead>Trend</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {popularContent.map((content) => (
          <TableRow key={content.id}>
            <TableCell className="font-medium">{content.title}</TableCell>
            <TableCell>{getCategoryBadge(content.category)}</TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                {content.views.toLocaleString()}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                {content.comments}
              </div>
            </TableCell>
            <TableCell>{content.engagement}</TableCell>
            <TableCell>
              {content.trend === 'up' ? (
                <div className="flex items-center text-green-600">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Rising
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <TrendingDown className="h-4 w-4 mr-1" />
                  Falling
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default PopularContentTable;
