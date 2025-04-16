
import { ArticleProps } from '@/components/Articles/ArticleCard';

export interface StoryboardEpisode {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnail: string;
  thumbnailUrl: string; // Adding this for backward compatibility
  duration: string;
  date: string;
  releaseDate: string; // Adding this for backward compatibility
  views?: number;
}

export interface StoryboardArticleProps extends ArticleProps {
  episodes: StoryboardEpisode[];
}

// Sample storyboard articles
export const storyboardArticles: StoryboardArticleProps[] = [
  {
    id: 'storyboard-1',
    title: 'Adventures in Science: Exploring the Cosmos',
    excerpt: 'Join Sarah and Max as they journey through space to learn about planets, stars, and the mysteries of our universe.',
    imageUrl: 'https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=800&auto=format&fit=crop',
    category: 'Storyboard',
    readingLevel: 'Beginner',
    readTime: 8,
    author: 'Space Explorers Club',
    date: 'April 1, 2025',
    publishDate: 'April 1, 2025',
    episodes: [
      {
        id: 'ep-1',
        title: 'Our Solar System',
        description: 'Sarah and Max begin their journey by exploring the planets in our solar system.',
        videoUrl: 'https://www.example.com/videos/solar-system.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=800&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=800&auto=format&fit=crop',
        duration: '4:30',
        date: 'April 1, 2025',
        releaseDate: 'April 1, 2025'
      },
      {
        id: 'ep-2',
        title: 'Stars and Galaxies',
        description: 'Our explorers venture beyond our solar system to discover what makes stars shine.',
        videoUrl: 'https://www.example.com/videos/stars.mp4',
        thumbnail: 'https://images.unsplash.com/photo-1539321908154-04927596764d?w=800&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1539321908154-04927596764d?w=800&auto=format&fit=crop',
        duration: '5:15',
        date: 'April 8, 2025',
        releaseDate: 'April 8, 2025'
      }
    ]
  }
];
