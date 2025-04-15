
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

  const getCategoryDescription = (category: string): string => {
    const descriptionMap: Record<string, string> = {
      'Headliners': 'Breaking news and important stories from around the world',
      'Debates': 'Explore different sides of important topics and share your opinion',
      'Spice It Up': 'Fun and interesting video content to brighten your day',
      'Storyboard': 'Creative stories told through engaging series and episodes',
      'In the Neighborhood': 'Local news and events happening in communities like yours',
      'Learning': 'Educational articles that help you learn something new',
      'School News': 'Updates and stories from schools across the country'
    };
    
    return descriptionMap[category] || 'Discover interesting articles in this category';
  };

  const getColorClass = () => {
    const categoryColorClass = getCategoryColor(title);
    const colorName = categoryColorClass.split('-')[1].split(' ')[0];
    
    return {
      border: `border-flyingbus-${colorName}`,
      text: `text-flyingbus-${colorName}`,
      bg: `bg-flyingbus-${colorName}`
    };
  };
  
  const colorClasses = getColorClass();
  const svgPath = getCategoryIcon(title);

  return (
    <section className="py-8">
      <div className="flex flex-col gap-6 mb-10">
        <div className="flex flex-col gap-4">
          <div className="relative transform -rotate-[30deg] self-start">
            <div 
              className="w-[80px] h-[80px] md:w-[120px] md:h-[120px] bg-white shadow-category-icon overflow-hidden p-1.5"
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
          
          <div>
            <h2 className="category-title">{title}</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-md">{getCategoryDescription(title)}</p>
          </div>
        
          <Link 
            to={`/${slug}`} 
            className="flex items-center text-sm font-medium hover:text-gray-800 hover:underline self-start"
          >
            See All <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>
      </div>
      
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
      
      <div className="grid grid-cols-1 md:hidden gap-6">
        {articles.map((article) => (
          <ArticleCard key={article.id} {...article} />
        ))}
      </div>
    </section>
  );
};

export default CategorySection;
