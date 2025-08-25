
import React, { useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ArticleCard, { ArticleProps } from './ArticleCard';
import { ArrowRight } from 'lucide-react';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNavigation 
} from '@/components/ui/custom-carousel';
import { getCategoryColor } from '@/utils/categoryColors';
import { useIsMobile } from '@/hooks/use-mobile';
import { logger, LogSource } from '@/utils/logger';

interface CategorySectionProps {
  title: string;
  slug: string;
  articles: ArticleProps[];
  color: string;
}

const CategorySection = React.memo(({ title, slug, articles, color }: CategorySectionProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  // Memoize category icon lookup to prevent recalculation
  const getCategoryIcon = useMemo(() => (category: string): string => {
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
  }, []);

  // Memoize category description lookup
  const getCategoryDescription = useMemo(() => (category: string): string => {
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
  }, []);

  // Memoize color class calculation
  const getColorClass = useMemo(() => {
    const categoryColorClass = getCategoryColor(title);
    
    // Handle case where getCategoryColor returns empty string or undefined
    if (!categoryColorClass || !categoryColorClass.includes('-')) {
      // Default to blue if no color mapping found
      return {
        border: 'border-flyingbus-blue',
        text: 'text-flyingbus-blue',
        bg: 'bg-flyingbus-blue'
      };
    }
    
    const colorName = categoryColorClass.split('-')[1].split(' ')[0];
    
    return {
      border: `border-flyingbus-${colorName}`,
      text: `text-flyingbus-${colorName}`,
      bg: `bg-flyingbus-${colorName}`
    };
  }, [title]);
  
  const colorClasses = getColorClass;
  const svgPath = getCategoryIcon(title);
  
  // Memoize category URL
  const categoryUrl = useMemo(() => `/${slug.toLowerCase()}`, [slug]);

  // Memoize navigation handler
  const handleCategoryNavigate = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    logger.info(LogSource.APP, 'Navigating to category', { 
      category: title,
      url: categoryUrl
    });
    navigate(categoryUrl);
  }, [title, categoryUrl, navigate]);

  // Memoize article click handler
  const handleArticleClick = useCallback((articleId: string) => {
    logger.info(LogSource.ARTICLE, 'Article clicked in carousel', { articleId, category: title });
  }, [title]);

  return (
    <section className="py-8">
      <div className="flex flex-row items-start justify-between gap-6 mb-10">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="category-title">{title}</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-md">
              {getCategoryDescription(title)}
            </p>
          </div>
          
          <Link 
            to={categoryUrl} 
            onClick={handleCategoryNavigate}
            className="flex items-center text-sm font-medium hover:text-gray-800 hover:underline self-start"
          >
            See All <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>
        
        <div className="relative transform rotate-[15deg]">
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
      </div>
      
      <div className="hidden md:block relative">
        <Carousel disableDrag={true}>
          <CarouselContent className="-ml-6">
            {articles.map((article) => (
              <CarouselItem key={article.id} className="pl-6 basis-1/3 pointer-events-auto">
                <ArticleCard {...article} onClick={() => handleArticleClick(article.id)} />
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
});

CategorySection.displayName = 'CategorySection';

export default CategorySection;
