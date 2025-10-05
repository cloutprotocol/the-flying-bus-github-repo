import React from 'react';
import { AdminErrorBoundary } from './AdminErrorBoundary';
import { AlertCircle, BarChart3, Activity, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SectionErrorFallbackProps {
  error: Error;
  retry: () => void;
  sectionType: 'metrics' | 'activities' | 'articles';
}

const SectionErrorFallback: React.FC<SectionErrorFallbackProps> = ({ 
  error, 
  retry, 
  sectionType 
}) => {
  const getSectionConfig = () => {
    switch (sectionType) {
      case 'metrics':
        return {
          icon: BarChart3,
          title: 'Dashboard Metrics',
          description: 'Unable to load dashboard statistics'
        };
      case 'activities':
        return {
          icon: Activity,
          title: 'Recent Activity',
          description: 'Unable to load activity feed'
        };
      case 'articles':
        return {
          icon: FileText,
          title: 'Recent Articles',
          description: 'Unable to load recent articles'
        };
      default:
        return {
          icon: AlertCircle,
          title: 'Dashboard Section',
          description: 'Unable to load this section'
        };
    }
  };

  const { icon: Icon, title, description } = getSectionConfig();

  return (
    <div className="p-6 border border-gray-200 rounded-lg bg-gray-50">
      <div className="flex items-center space-x-3 mb-3">
        <Icon className="h-5 w-5 text-gray-400" />
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      </div>
      
      <div className="space-y-3">
        <p className="text-sm text-gray-600">{description}</p>
        
        <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
          Error: {error.message}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={retry}
          className="w-full"
        >
          Retry Loading
        </Button>
      </div>
    </div>
  );
};

// Specific error boundaries for each dashboard section
export const MetricsErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AdminErrorBoundary
    section="metrics"
    fallback={(props) => <SectionErrorFallback {...props} sectionType="metrics" />}
  >
    {children}
  </AdminErrorBoundary>
);

export const ActivitiesErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AdminErrorBoundary
    section="activities"
    fallback={(props) => <SectionErrorFallback {...props} sectionType="activities" />}
  >
    {children}
  </AdminErrorBoundary>
);

export const ArticlesErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AdminErrorBoundary
    section="recent articles"
    fallback={(props) => <SectionErrorFallback {...props} sectionType="articles" />}
  >
    {children}
  </AdminErrorBoundary>
);

export default {
  MetricsErrorBoundary,
  ActivitiesErrorBoundary,
  ArticlesErrorBoundary
};