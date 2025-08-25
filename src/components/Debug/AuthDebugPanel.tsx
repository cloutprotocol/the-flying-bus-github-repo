
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Memoized debug content to prevent unnecessary re-renders
const DebugContent = React.memo(({ 
  isLoggedIn, 
  isLoading, 
  isInitialized,
  currentUser 
}: {
  isLoggedIn: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  currentUser: any;
}) => (
  <Card className="fixed bottom-4 right-4 w-80 bg-yellow-50 border-yellow-200 z-50">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm flex items-center gap-2">
        🐛 Auth Debug Panel
        <Badge variant={isLoggedIn ? "default" : "secondary"} className="text-xs">
          {isLoggedIn ? "Logged In" : "Logged Out"}
        </Badge>
      </CardTitle>
    </CardHeader>
    <CardContent className="text-xs space-y-2">
      <div>
        <strong>Loading:</strong> {isLoading ? "Yes" : "No"}
      </div>
      <div>
        <strong>Initialized:</strong> {isInitialized ? "Yes" : "No"}
      </div>
      <div>
        <strong>User ID:</strong> {currentUser?.id || "None"}
      </div>
      <div>
        <strong>Username:</strong> {currentUser?.username || "None"}
      </div>
      <div>
        <strong>Display Name:</strong> {currentUser?.display_name || "None"}
      </div>
      <div>
        <strong>Role:</strong> {currentUser?.role || "None"}
      </div>
      <div>
        <strong>Email:</strong> {currentUser?.email || "None"}
      </div>
    </CardContent>
  </Card>
));

DebugContent.displayName = 'DebugContent';

const AuthDebugPanel = React.memo(() => {
  const { currentUser, isLoggedIn, isLoading, isInitialized } = useAuth();

  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <DebugContent 
      isLoggedIn={isLoggedIn}
      isLoading={isLoading}
      isInitialized={isInitialized}
      currentUser={currentUser}
    />
  );
});

AuthDebugPanel.displayName = 'AuthDebugPanel';

export default AuthDebugPanel;
