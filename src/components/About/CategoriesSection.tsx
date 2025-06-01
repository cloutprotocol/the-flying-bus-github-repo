import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { getCategoryIconComponent } from '@/utils/getCategoryIcon';

const categories = [
  { name: 'Headliners', path: '/headliners', description: 'Breaking news and top stories from young journalists' },
  { name: 'Debates', path: '/debates', description: 'Thoughtful discussions on topics that matter to kids' },
  { name: 'Spice It Up', path: '/spice-it-up', description: 'Fun and interesting stories that add flavor to your day' },
  { name: 'Storyboard', path: '/storyboard', description: 'Creative writing and episodic stories' },
  { name: 'In the Neighborhood', path: '/neighborhood', description: 'Local news and community events' },
  { name: 'Learning', path: '/learning', description: 'Educational content and resources for curious minds' },
  { name: 'School News', path: '/school', description: 'Updates and stories from schools around the world' }
];

const CategoriesSection = () => {
  return (
    <section className="py-16 md:py-20 bg-gradient-to-br from-flyingbus-yellow/5 to-flyingbus-red/5">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="section-headline">
            Explore Our Categories
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover diverse content areas where young journalists can express 
            their creativity and share their unique perspectives.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => {
            const IconComponent = getCategoryIconComponent(category.name);
            return (
              <Link key={index} to={category.path}>
                <Card className="h-full group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 rounded-lg bg-flyingbus-purple/10 group-hover:bg-flyingbus-purple/20 transition-colors">
                        <IconComponent className="h-6 w-6 text-flyingbus-purple" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2 text-gray-900 group-hover:text-flyingbus-purple transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {category.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
