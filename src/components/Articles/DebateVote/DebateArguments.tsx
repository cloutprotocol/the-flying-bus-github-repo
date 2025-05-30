
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface DebateArgumentsProps {
  yesPosition?: string;
  noPosition?: string;
}

const DebateArguments: React.FC<DebateArgumentsProps> = ({ yesPosition, noPosition }) => {
  const [expandedYes, setExpandedYes] = useState(false);
  const [expandedNo, setExpandedNo] = useState(false);

  // Don't render if no arguments are provided
  if (!yesPosition && !noPosition) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-3">Debate Arguments</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Yes Position */}
        {yesPosition && (
          <Card className="border-green-200 bg-green-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-green-700 flex items-center justify-between">
                <span>Arguments For (Yes)</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedYes(!expandedYes)}
                  className="text-green-600 hover:text-green-800 p-1"
                >
                  {expandedYes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`text-gray-700 text-sm ${expandedYes ? '' : 'line-clamp-3'}`}>
                {yesPosition}
              </div>
              {yesPosition.length > 150 && !expandedYes && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedYes(true)}
                  className="text-green-600 hover:text-green-800 p-0 h-auto mt-2"
                >
                  Read more...
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* No Position */}
        {noPosition && (
          <Card className="border-red-200 bg-red-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-red-700 flex items-center justify-between">
                <span>Arguments Against (No)</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedNo(!expandedNo)}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  {expandedNo ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`text-gray-700 text-sm ${expandedNo ? '' : 'line-clamp-3'}`}>
                {noPosition}
              </div>
              {noPosition.length > 150 && !expandedNo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedNo(true)}
                  className="text-red-600 hover:text-red-800 p-0 h-auto mt-2"
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DebateArguments;
