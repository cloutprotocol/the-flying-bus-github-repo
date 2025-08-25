
import { useState, useEffect } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import FeatureArticle from '@/components/Articles/FeatureArticle';
import CategorySection from '@/components/Articles/CategorySection';
import { ArticleProps } from '@/components/Articles/ArticleCard';
import { Skeleton } from '@/components/ui/skeleton';
import { getHeadlineArticle, getCategoryArticles } from '@/data/articles';

interface HomePageState {
  headlineArticle: ArticleProps | null;
  categoryArticles: Record<string, ArticleProps[]>;
  isLoading: boolean;
  error: string | null;
}

// Define categories to display on home page
const categories = [
  { title: 'Headliners', slug: 'headliners', color: 'blue' },
  { title: 'Debates', slug: 'debates', color: 'red' },
  { title: 'Learning', slug: 'learning', color: 'green' },
  { title: 'Neighborhood', slug: 'neighborhood', color: 'purple' },
  { title: 'School News', slug: 'school-news', color: 'yellow' },
  { title: 'Spice It Up', slug: 'spice-it-up', color: 'orange' },
  { title: 'Storyboard', slug: 'storyboard', color: 'pink' }
];

const Index = () => {
  const [state, setState] = useState<HomePageState>({
    headlineArticle: null,
    categoryArticles: {},
    isLoading: true,
    error: null
  });

  const fetchData = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Fetch headline article
      const headlineArticle = await getHeadlineArticle();

      // Fetch articles for each category
      const categoryArticles: Record<string, ArticleProps[]> = {};
      
      for (const category of categories) {
        const articles = await getCategoryArticles(category.title);
        if (articles.length > 0) {
          categoryArticles[category.title] = articles;
        }
      }

      setState({
        headlineArticle,
        categoryArticles,
        isLoading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching home page data:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Unable to load articles. Please try again.'
      }));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (state.isLoading) {
    return (
      <MainLayout fullWidth={true}>
        <div className="flex flex-col items-center justify-center h-[50vh] w-full">
          <div className="text-center mb-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-flyingbus-blue mx-auto mb-4"></div>
            <p className="text-gray-600">Loading articles...</p>
          </div>
          
          <Skeleton className="w-full h-64 mb-8" />
          <div className="max-w-6xl w-full mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (state.error) {
    return (
      <MainLayout fullWidth={true}>
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="text-center max-w-lg mx-auto px-4">
            <div className="mb-6">
              <div className="text-6xl mb-4">⚠️</div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Something Went Wrong
            </h2>
            
            <p className="text-gray-600 mb-6 leading-relaxed">{state.error}</p>
            
            <div className="space-y-3">
              <button 
                className="w-full px-6 py-3 bg-flyingbus-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                onClick={fetchData}
              >
                Try Again
              </button>
              
              <button 
                className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Check if we have any content to display
  const hasHeadlineArticle = state.headlineArticle !== null;
  const categoriesWithContent = categories.filter(category => {
    const articles = state.categoryArticles[category.title] || [];
    return articles.length > 0;
  });
  const hasAnyContent = hasHeadlineArticle || categoriesWithContent.length > 0;

  if (!hasAnyContent) {
    return (
      <MainLayout fullWidth={true}>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center max-w-2xl mx-auto px-4">
            <div className="mb-8">
              <div className="text-6xl mb-4">📰</div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Published Content Yet</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              We're working on creating amazing content for you. Check back soon for exciting articles!
            </p>
            <button 
              onClick={fetchData}
              className="px-6 py-3 bg-flyingbus-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Check for New Content
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      {/* Featured Article Section */}
      {hasHeadlineArticle && (
        <div className="w-full px-0 sm:px-4 py-0 sm:py-4 mb-8">
          <FeatureArticle {...state.headlineArticle} />
        </div>
      )}
      
      {/* Category Sections */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="space-y-12">
          {categoriesWithContent.map((category) => {
            const articles = state.categoryArticles[category.title] || [];
            
            return (
              <CategorySection
                key={category.slug}
                title={category.title}
                slug={category.slug}
                articles={articles}
                color={category.color}
              />
            );
          })}
        </div>
        
        <div className="pb-8 md:pb-16" />
      </div>
    </MainLayout>
  );
};

export default Index;
