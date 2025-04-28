
export interface CategoryRoute {
  path: string;
  slug: string;
  name: string;
  description?: string;
}

// Define routes with consistent slugs matching database
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
    slug: 'spice',
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
    path: '/neighborhood',
    slug: 'neighborhood',
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
    slug: 'school',
    name: 'School News',
    description: 'Updates from schools'
  }
];

export function getNavItemsFromCategories() {
  return categoryRoutes.map(route => ({
    text: route.name,
    label: route.name,
    to: route.path,
    href: route.path,
    description: route.description
  }));
}

export function getCategoryBySlug(slug: string): CategoryRoute | undefined {
  const sanitizedSlug = slug.toLowerCase();
  return categoryRoutes.find(route => route.slug === sanitizedSlug);
}

export function getCategoryByPath(path: string): CategoryRoute | undefined {
  // Remove leading slash for comparison if present
  const sanitizedPath = path.startsWith('/') ? path.slice(1) : path;
  return categoryRoutes.find(route => {
    const routePath = route.path.startsWith('/') ? route.path.slice(1) : route.path;
    return routePath === sanitizedPath;
  });
}
