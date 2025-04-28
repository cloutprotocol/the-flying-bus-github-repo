
import { getCategoryIcon } from '@/utils/getCategoryIcon';
import { NavItem } from '@/components/Layout/menuItems';

export interface CategoryRoute {
  path: string;
  slug: string;
  name: string;
  description?: string;
  color?: string;
}

export const categoryRoutes: CategoryRoute[] = [
  {
    path: '/headliners',
    slug: 'headliners',
    name: 'Headliners',
    description: 'Breaking news and top stories'
  },
  {
    path: '/debates',
    slug: 'debates',
    name: 'Debates',
    description: 'Join the conversation'
  },
  {
    path: '/spice-it-up',
    slug: 'spice-it-up',
    name: 'Spice It Up',
    description: 'Fun and interesting stories'
  },
  {
    path: '/storyboard',
    slug: 'storyboard',
    name: 'Storyboard',
    description: 'Stories that continue'
  },
  {
    path: '/in-the-neighborhood',
    slug: 'in-the-neighborhood',
    name: 'In the Neighborhood',
    description: 'Local news and events'
  },
  {
    path: '/learning',
    slug: 'learning',
    name: 'Learning',
    description: 'Educational content'
  },
  {
    path: '/school-news',
    slug: 'school-news',
    name: 'School News',
    description: 'Updates from schools'
  }
];

export function getNavItemsFromCategories(): NavItem[] {
  return categoryRoutes.map(route => ({
    text: route.name,
    label: route.name,
    to: route.path,
    href: route.path,
    description: route.description
  }));
}

export function getCategoryBySlug(slug: string): CategoryRoute | undefined {
  return categoryRoutes.find(route => route.slug === slug);
}

export function getCategoryByPath(path: string): CategoryRoute | undefined {
  return categoryRoutes.find(route => route.path === path);
}

