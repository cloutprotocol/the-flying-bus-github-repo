
import React from 'react';
import { Link } from 'react-router-dom';
import ArticleCard, { ArticleProps } from './ArticleCard';
import { ArrowRight } from 'lucide-react';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNavigation 
} from '@/components/ui/custom-carousel';
import { getCategoryColor } from '@/utils/categoryColors';

interface CategorySectionProps {
  title: string;
  slug: string;
  articles: ArticleProps[];
  color: string;
}

const CategorySection = ({ title, slug, articles, color }: CategorySectionProps) => {
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

  // Map category to correct Tailwind color based on our updated utility
  const getColorClass = () => {
    const categoryColorClass = getCategoryColor(title);
    const colorName = categoryColorClass.split('-')[1].split(' ')[0]; // Extract color name from bg-flyingbus-{color}
    
    return {
      border: `border-flyingbus-${colorName}`,
      text: `text-flyingbus-${colorName}`,
      bg: `bg-flyingbus-${colorName}`
    };
  };
  
  const colorClasses = getColorClass();
  const svgPath = getCategorySvg(title);

  return (
    <section className="py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-10">
          {/* Image frame with category-specific SVG - rotated 30 degrees counter-clockwise */}
          <div className="relative transform -rotate-[30deg]">
            <div 
              className="w-[96px] h-[96px] md:w-[120px] md:h-[120px] bg-white rounded-md shadow-category-icon overflow-hidden p-2.5"
            >
              <div className={`w-full h-full ${colorClasses.bg} flex items-center justify-center`}>
                <img 
                  src={svgPath} 
                  alt={`${title} icon`} 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
          
          <h2 className="category-title">{title}</h2>
        </div>
        
        <Link 
          to={`/${slug}`} 
          className="flex items-center text-sm font-medium hover:text-gray-800 hover:underline"
        >
          See All <ArrowRight size={16} className="ml-1" />
        </Link>
      </div>
      
      {/* For desktop and larger screens, show carousel */}
      <div className="hidden md:block relative">
        <Carousel>
          <CarouselContent className="-ml-6">
            {articles.map((article) => (
              <CarouselItem key={article.id} className="pl-6 basis-1/3">
                <ArticleCard {...article} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselNavigation 
            classNameButton={`bg-white border border-gray-200 shadow-sm hover:bg-gray-50 *:stroke-${title === 'Spice It Up' ? 'black' : colorClasses.text.replace('text-', '')}`}
          />
        </Carousel>
      </div>
      
      {/* For mobile, show grid layout */}
      <div className="grid grid-cols-1 md:hidden gap-6">
        {articles.map((article) => (
          <ArticleCard key={article.id} {...article} />
        ))}
      </div>
    </section>
  );
};

export default CategorySection;

