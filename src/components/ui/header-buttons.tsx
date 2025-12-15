
import * as React from "react"
import { User, BookOpen, Loader2 } from "lucide-react"
import { NavButton } from "./nav-button"
import { RainbowButton } from "./rainbow-button"
import { useAuth } from "@/contexts/AuthContext"
import UserMenu from "@/components/Auth/UserMenu"
import { DrawerAuth } from "@/components/ui/drawer-auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useConvexAuth } from "convex/react"

interface HeaderButtonsProps {
  className?: string
}

// Memoized loading component to prevent unnecessary re-renders
const LoadingButtons = React.memo(({ className }: { className?: string }) => (
  <div className={`flex items-center space-x-3 ${className}`}>
    <div className="flex items-center gap-2 text-gray-400 px-3 py-1.5">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-xs">Loading...</span>
    </div>
  </div>
));

// Memoized authenticated buttons to prevent unnecessary re-renders
const AuthenticatedButtons = React.memo(({
  className,
  displayName
}: {
  className?: string;
  displayName?: string;
}) => (
  <div className={`flex items-center space-x-3 ${className}`}>
    <div className="hidden md:flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700">
        {displayName}
      </span>
      <UserMenu />
    </div>
  </div>
));

// Memoized unauthenticated buttons to prevent unnecessary re-renders
const UnauthenticatedButtons = React.memo(({ className }: { className?: string }) => (
  <div className={`flex items-center space-x-3 ${className}`}>
    {/* Drawer Auth for Sign In */}
    <div className="hidden md:block">
      <DrawerAuth
        triggerComponent={
          <NavButton variant="outline">
            <User className="mr-2 h-4 w-4" />
            Sign In
          </NavButton>
        }
        defaultTab="sign-in"
      />
    </div>

    {/* Drawer Auth for Sign Up/Join Us button */}
    <div className="hidden md:block">
      <DrawerAuth
        triggerComponent={
          <RainbowButton className="flex items-center hover:scale-105 active:scale-95 transition-transform">
            <BookOpen className="mr-2 h-4 w-4" />
            Join Us
          </RainbowButton>
        }
        defaultTab="sign-up"
      />
    </div>
  </div>
));

LoadingButtons.displayName = 'LoadingButtons';
AuthenticatedButtons.displayName = 'AuthenticatedButtons';
UnauthenticatedButtons.displayName = 'UnauthenticatedButtons';

export const HeaderButtons: React.FC<HeaderButtonsProps> = React.memo(({ className }) => {
  const { isLoggedIn, isLoading, currentUser, isInitialized } = useAuth();
  const { isAuthenticated: convexIsAuthenticated, isLoading: convexLoading } = useConvexAuth();

  // Prefer Convex auth as the source of truth to avoid stale UI during migrations
  const authed = convexIsAuthenticated || isLoggedIn;
  const loading = (isLoading || convexLoading) && !authed && !isInitialized;

  if (loading) {
    return <LoadingButtons className={className} />;
  }

  if (authed) {
    return <AuthenticatedButtons className={className} displayName={currentUser?.display_name} />;
  }

  return <UnauthenticatedButtons className={className} />;
});

HeaderButtons.displayName = 'HeaderButtons';
