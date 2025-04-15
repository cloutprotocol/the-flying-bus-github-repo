
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  MessageSquare, 
  Award, 
  UserPlus 
} from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  change: {
    value: string;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon }) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <div className="flex items-center mt-1">
              {change.type === 'increase' ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : change.type === 'decrease' ? (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              ) : null}
              <span 
                className={`text-xs ${
                  change.type === 'increase' 
                    ? 'text-green-500' 
                    : change.type === 'decrease' 
                    ? 'text-red-500' 
                    : 'text-muted-foreground'
                }`}
              >
                {change.value}
              </span>
            </div>
          </div>
          <div className="p-2 bg-gray-100 rounded-full">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface OverviewMetricsProps {
  dateRange: string;
}

const OverviewMetrics: React.FC<OverviewMetricsProps> = ({ dateRange }) => {
  // Mock data based on date range - in a real application, this would be fetched from an API
  const getMetrics = () => {
    switch (dateRange) {
      case '7d':
        return {
          views: { value: '12,845', change: { value: '+12.3%', type: 'increase' as const } },
          readers: { value: '3,721', change: { value: '+5.8%', type: 'increase' as const } },
          comments: { value: '243', change: { value: '+18.2%', type: 'increase' as const } },
          engagement: { value: '14.2%', change: { value: '-2.1%', type: 'decrease' as const } }
        };
      case '30d':
        return {
          views: { value: '46,290', change: { value: '+8.7%', type: 'increase' as const } },
          readers: { value: '12,468', change: { value: '+11.3%', type: 'increase' as const } },
          comments: { value: '978', change: { value: '+7.6%', type: 'increase' as const } },
          engagement: { value: '15.3%', change: { value: '+1.7%', type: 'increase' as const } }
        };
      case '90d':
        return {
          views: { value: '125,840', change: { value: '+22.5%', type: 'increase' as const } },
          readers: { value: '33,295', change: { value: '+16.9%', type: 'increase' as const } },
          comments: { value: '2,834', change: { value: '+15.1%', type: 'increase' as const } },
          engagement: { value: '16.7%', change: { value: '+3.2%', type: 'increase' as const } }
        };
      default:
        return {
          views: { value: '356,712', change: { value: '+45.2%', type: 'increase' as const } },
          readers: { value: '89,427', change: { value: '+32.7%', type: 'increase' as const } },
          comments: { value: '7,896', change: { value: '+28.4%', type: 'increase' as const } },
          engagement: { value: '19.2%', change: { value: '+5.8%', type: 'increase' as const } }
        };
    }
  };

  const metrics = getMetrics();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Total Views"
        value={metrics.views.value}
        change={metrics.views.change}
        icon={<Eye className="h-5 w-5 text-blue-500" />}
      />
      <MetricCard
        title="Active Readers"
        value={metrics.readers.value}
        change={metrics.readers.change}
        icon={<UserPlus className="h-5 w-5 text-green-500" />}
      />
      <MetricCard
        title="Comments"
        value={metrics.comments.value}
        change={metrics.comments.change}
        icon={<MessageSquare className="h-5 w-5 text-purple-500" />}
      />
      <MetricCard
        title="Engagement Rate"
        value={metrics.engagement.value}
        change={metrics.engagement.change}
        icon={<Award className="h-5 w-5 text-amber-500" />}
      />
    </div>
  );
};

export default OverviewMetrics;
