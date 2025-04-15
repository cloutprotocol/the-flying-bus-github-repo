
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import { storyboardArticles } from '@/data/articles/storyboard';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { 
  BookMarked, 
  InfoIcon, 
  Play,
  CalendarDays
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CategoryHeader from '@/components/Category/CategoryHeader';

const StoryboardCategoryPage = () => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <MainLayout>
      <div className="py-8">
        {/* Category Header */}
        <div className="mb-10">
          <CategoryHeader 
            displayCategory="Storyboard" 
            colorName="purple"
          />
          <p className="mt-4 text-gray-600 max-w-3xl">
            Student-created series presented in episodic format. Each storyboard contains multiple episodes
            that tell a complete story, written and produced by Flying Bus young journalists.
          </p>
        </div>

        {/* Main Grid of Storyboard Series */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {storyboardArticles.map((series) => (
            <div 
              key={series.id}
              className="bg-white rounded-lg overflow-hidden shadow-md transition-all duration-300 hover:shadow-xl"
              onMouseEnter={() => setHoveredId(series.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <Link to={`/storyboard/${series.id}`} className="block relative">
                <div className="relative">
                  <AspectRatio ratio={16/9}>
                    <img 
                      src={series.imageUrl} 
                      alt={series.title}
                      className="w-full h-full object-cover transition-transform duration-500 ease-in-out"
                      style={{
                        transform: hoveredId === series.id ? 'scale(1.05)' : 'scale(1)'
                      }}
                    />
                  </AspectRatio>
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-70"></div>
                  
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className="bg-flyingbus-purple text-white">
                      <BookMarked size={12} className="mr-1" />
                      Storyboard
                    </Badge>
                    {series.readingLevel && (
                      <Badge variant="outline" className="bg-white/90 text-gray-800">
                        {series.readingLevel}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Episode count badge */}
                  <div className="absolute bottom-3 right-3">
                    <Badge variant="outline" className="bg-black/50 text-white border-none">
                      {series.episodes.length} Episodes
                    </Badge>
                  </div>
                </div>
                
                {/* Hover overlay with play button */}
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300"
                  style={{
                    opacity: hoveredId === series.id ? 1 : 0
                  }}
                >
                  <Button className="bg-white text-gray-900 hover:bg-white/90">
                    <Play className="mr-2" size={16} />
                    Watch Series
                  </Button>
                </div>
              </Link>
              
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2 line-clamp-1" style={{ textWrap: 'balance' }}>
                  {series.title}
                </h3>
                <div className="flex items-center text-sm text-gray-500 mb-3">
                  <CalendarDays size={14} className="mr-1" />
                  <span>{series.date}</span>
                  <span className="mx-2">•</span>
                  <span>By {series.author}</span>
                </div>
                <p className="text-gray-600 line-clamp-2 mb-3">
                  {series.excerpt}
                </p>
                <div className="flex justify-between items-center">
                  <Link to={`/storyboard/${series.id}`}>
                    <Button variant="outline" size="sm" className="text-gray-700 hover:text-gray-900">
                      <InfoIcon size={14} className="mr-1" />
                      Series Details
                    </Button>
                  </Link>
                  <Link to={`/storyboard/${series.id}/episode/${series.episodes[0].id}`}>
                    <Button size="sm" className="bg-gray-800 hover:bg-gray-700 text-white">
                      <Play size={14} className="mr-1" />
                      First Episode
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default StoryboardCategoryPage;
