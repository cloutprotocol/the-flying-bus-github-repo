
// Utility function to map categories to their respective color classes
export const getCategoryColor = (category: string) => {
  const categories: {[key: string]: string} = {
    'Headliners': 'bg-flyingbus-red text-white',
    'Debates': 'bg-flyingbus-orange text-white',
    'Spice It Up': 'bg-flyingbus-yellow text-black',
    'Storyboard': 'bg-flyingbus-blue text-white',
    'In the Neighborhood': 'bg-flyingbus-green text-white',
    'Neighborhood': 'bg-flyingbus-green text-white', // Added mapping for 'Neighborhood'
    'Learning': 'bg-flyingbus-purple text-white',
    'Learning Resources': 'bg-flyingbus-purple text-white',
    'School News': 'bg-flyingbus-pink text-white'
  };
  
  return categories[category] || 'bg-flyingbus-blue text-white'; // Default to blue instead of empty string
};
