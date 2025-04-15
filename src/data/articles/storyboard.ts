
import { ArticleProps } from '@/components/Articles/ArticleCard';

export interface StoryboardEpisode {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: string;
  releaseDate: string;
}

export interface StoryboardArticleProps extends ArticleProps {
  episodes: StoryboardEpisode[];
}

export const storyboardArticles: StoryboardArticleProps[] = [
  {
    id: '5',
    title: 'Adventures of Space Explorer: Chapter One',
    excerpt: 'Join 12-year-old astronaut-in-training Zara on her first mission to a distant planet. Will she find alien life or something even more surprising?',
    category: 'Storyboard',
    author: 'Sophie Chen, 12',
    date: 'Apr 4, 2025',
    imageUrl: 'https://images.unsplash.com/photo-1517492929235-4be0916a848f?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fHNwYWNlJTIwa2lkfGVufDB8fDB8fHww',
    readingLevel: 'Ages 9-11',
    readTime: 8,
    commentCount: 8,
    episodes: [
      {
        id: '5-1',
        title: 'Episode 1: Liftoff',
        description: 'Zara prepares for her first space mission and faces unexpected challenges during liftoff.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1516849677043-ef67c9557e16?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8c3BhY2UlMjBsYXVuY2h8ZW58MHx8MHx8fDA%3D',
        videoUrl: 'https://www.youtube.com/embed/UzMIRs9surfM',
        duration: '4:30',
        releaseDate: 'Apr 4, 2025'
      },
      {
        id: '5-2',
        title: 'Episode 2: First Contact',
        description: 'Zara discovers something unexpected on the distant planet that changes her mission completely.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1581822261290-991b38693972?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8YWxpZW58ZW58MHx8MHx8fDA%3D',
        videoUrl: 'https://www.youtube.com/embed/fTFhLkSeN5Q',
        duration: '5:15',
        releaseDate: 'Apr 11, 2025'
      },
      {
        id: '5-3',
        title: 'Episode 3: The Journey Home',
        description: 'After her discoveries, Zara must navigate the challenges of returning to Earth with her new knowledge.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dm9sY2FubyUyMHByb2plY3R8ZW58MHx8MHx8fDA%3D',
        videoUrl: 'https://www.youtube.com/embed/TKfdy9hENmM',
        duration: '6:00',
        releaseDate: 'Apr 18, 2025'
      }
    ]
  },
  {
    id: '15',
    title: 'Creative Writing: A Journey to Mars',
    excerpt: 'Student-written science fiction story about a young astronaut\'s first mission to colonize Mars. An imaginative tale of adventure and discovery.',
    category: 'Storyboard',
    author: 'Olivia Wright, 12',
    date: 'Mar 25, 2025',
    imageUrl: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dm9sY2FubyUyMHByb2plY3R8ZW58MHx8MHx8fDA%3D',
    readingLevel: 'Ages 9-11',
    readTime: 7,
    commentCount: 12,
    episodes: [
      {
        id: '15-1',
        title: 'Episode 1: Preparing for Mars',
        description: 'The young astronauts prepare for their historic mission to Mars, facing challenges and excitement.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fHNwYWNlJTIwdHJhaW5pbmd8ZW58MHx8MHx8fDA%3D',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        duration: '5:45',
        releaseDate: 'Mar 25, 2025'
      },
      {
        id: '15-2',
        title: 'Episode 2: Landing on the Red Planet',
        description: 'The tense moments of the Mars landing and the first steps on the red planet.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1545156521-77bd85671d30?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8bWFyc3xlbnwwfHwwfHx8MA%3D%3D',
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        duration: '6:20',
        releaseDate: 'Apr 1, 2025'
      }
    ]
  }
];
