
import { getNavItemsFromCategories } from '@/utils/navigation/categoryRoutes';
import { NavItem } from '@/components/Layout/menuItems';

// Define the NavItem interface that can be used throughout the app
export interface NavItem {
  text?: string;
  label?: string;
  to?: string;
  href?: string;
  items?: NavItem[];
  description?: string;
}

// Define menu items for navigation using our utility function
const menuItems: NavItem[] = [
  ...getNavItemsFromCategories(),
  {
    label: "About",
    text: "About",
    href: "/about",
    to: "/about",
  },
];

export default menuItems;

