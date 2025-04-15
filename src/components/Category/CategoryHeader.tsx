
import React from 'react';

interface CategoryHeaderProps {
  displayCategory: string;
  colorName: string;
}

const CategoryHeader: React.FC<CategoryHeaderProps> = ({ 
  displayCategory,
  colorName
}) => {
  // Function to get the appropriate SVG file based on the category name
  const getCategorySvg = (category: string): string => {
    const categoryMap: Record<string, string> = {
      'Headliners': '/headliners-img.svg',
      'Debates': '/debates-img.svg',
      'Spice It Up': '/spice-it-up-img.svg',
      'Storyboard': '/storyboard-img.svg',
      'In the Neighborhood': '/in-the-neighborhood-img.svg',
      'Learning': '/learning-img.svg',
      'School News': '/school-learning-img.svg'
    };
    
    return categoryMap[category] || '/placeholder.svg';
  };

  const svgPath = getCategorySvg(displayCategory);

  return (
    <div className="flex items-center gap-10">
      {/* Image frame with category-specific SVG - rotated 30 degrees counter-clockwise */}
      <div className="relative transform -rotate-[30deg]">
        <div 
          className="w-[120px] h-[120px] md:w-[144px] md:h-[144px] bg-white rounded-md shadow-category-icon overflow-hidden p-2.5"
        >
          <div className={`w-full h-full bg-flyingbus-${colorName} flex items-center justify-center`}>
            <img 
              src={svgPath} 
              alt={`${displayCategory} icon`} 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
      
      {/* Category title */}
      <h1 className="category-title">
        {displayCategory}
      </h1>
    </div>
  );
};

export default CategoryHeader;

