
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCategoryIcon } from '@/utils/getCategoryIcon';
import { Badge } from '@/components/ui/badge';

interface SelectedCategoryDisplayProps {
  categoryName?: string;
  categorySlug?: string;
  articleType?: string;
}

const SelectedCategoryDisplay: React.FC<SelectedCategoryDisplayProps> = ({
  categoryName,
  categorySlug,
  articleType
}) => {
  if (!categoryName) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Selected Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getCategoryIcon(categoryName)}</span>
          <div className="flex-1">
            <div className="font-medium">{categoryName}</div>
            {articleType && articleType !== 'standard' && (
              <Badge variant="secondary" className="mt-1 text-xs">
                {articleType.charAt(0).toUpperCase() + articleType.slice(1)} Article
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SelectedCategoryDisplay;
