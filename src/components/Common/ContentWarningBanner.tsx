import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  AlertCircle,
  X,
  Info,
  ShieldAlert
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  getContentWarning,
  WarningLevel,
  WarningCategory,
  ContentType
} from '@/services/safety';

interface ContentWarningBannerProps {
  contentId: string;
  contentType: ContentType;
  className?: string;
}

const ContentWarningBanner: React.FC<ContentWarningBannerProps> = ({
  contentId,
  contentType,
  className = '',
}) => {
  const [warning, setWarning] = useState<{
    level: WarningLevel;
    category: WarningCategory;
    message?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  
  useEffect(() => {
    const fetchWarning = async () => {
      setLoading(true);
      try {
        const { warning, error } = await getContentWarning(contentId, contentType);
        
        if (error) {
          console.error('Error fetching content warning:', error);
        } else if (warning && warning.level !== 'none') {
          setWarning(warning);
        }
      } catch (err) {
        console.error('Exception fetching content warning:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchWarning();
  }, [contentId, contentType]);
  
  if (!warning || dismissed || loading || warning.level === 'none') {
    return null;
  }
  
  const getWarningColor = () => {
    switch (warning.level) {
      case 'mild':
        return 'bg-blue-50 border-blue-100 text-blue-800';
      case 'moderate':
        return 'bg-amber-50 border-amber-100 text-amber-800';
      case 'high':
        return 'bg-red-50 border-red-100 text-red-800';
      default:
        return 'bg-gray-50 border-gray-100 text-gray-800';
    }
  };
  
  const getWarningIcon = () => {
    switch (warning.category) {
      case 'sensitive_topic':
        return <Info className="h-5 w-5" />;
      case 'mature_content':
        return <AlertCircle className="h-5 w-5" />;
      case 'controversial':
        return <AlertTriangle className="h-5 w-5" />;
      case 'graphic_content':
        return <ShieldAlert className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };
  
  const getWarningTitle = () => {
    switch (warning.category) {
      case 'sensitive_topic':
        return 'Sensitive Topic';
      case 'mature_content':
        return 'Mature Content';
      case 'controversial':
        return 'Controversial Content';
      case 'graphic_content':
        return 'Graphic Content';
      default:
        return 'Content Warning';
    }
  };
  
  return (
    <Card className={`border ${getWarningColor()} ${className}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 ${warning.level === 'high' ? 'text-red-600' : ''}`}>
              {getWarningIcon()}
            </div>
            <div>
              <h4 className="font-medium text-sm">{getWarningTitle()}</h4>
              <p className="text-sm">
                {warning.message || 
                  "This content may contain material that some readers may find challenging or sensitive. Please proceed with awareness."}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContentWarningBanner;
