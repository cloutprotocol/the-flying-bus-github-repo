
import React, { useState } from 'react';
import { Bug, Check, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ArticleDebugStep } from '@/hooks/useArticleDebug';

interface ArticleDebugPanelProps {
  steps: ArticleDebugStep[];
}

const ArticleDebugPanel: React.FC<ArticleDebugPanelProps> = ({ steps }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = (status: ArticleDebugStep['status']) => {
    switch (status) {
      case 'success':
        return <Check className="h-3 w-3 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      case 'pending':
      default:
        return <Clock className="h-3 w-3 text-yellow-500" />;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (steps.length === 0) return null;

  return (
    <div className="bg-slate-100 border-b border-slate-200 w-full py-1 px-4 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold flex items-center gap-1">
            <Bug className="h-3 w-3" /> Article Debug:
          </span>
          <span className="text-slate-600">
            {steps.length} operations logged
          </span>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-5 text-xs" 
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Less' : 'More'} details
        </Button>
      </div>
      
      {isExpanded && (
        <div className="mt-2 mb-1 space-y-1 bg-white p-2 rounded text-slate-800">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-2 text-xs">
              <span className="mt-1">{getStatusIcon(step.status)}</span>
              <div>
                <div className="font-medium">{step.action}</div>
                {step.details && (
                  <pre className="text-xs text-slate-500 mt-1">
                    {JSON.stringify(step.details, null, 2)}
                  </pre>
                )}
                <span className="text-slate-400 text-[10px]">
                  {formatTime(step.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArticleDebugPanel;
