
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useConvexAuth } from 'convex/react';
import { Badge } from '@/components/ui/badge';

// Memoized debug content to prevent unnecessary re-renders
const DebugContent = React.memo(({
  isLoggedIn,
  isLoading,
  isInitialized,
  currentUser,
  serverIsAuthed
}: {
  isLoggedIn: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  currentUser: any;
  serverIsAuthed: any;
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
      <div>
        <strong>Server Authed:</strong> {String(serverIsAuthed)}
      </div>
      <div>
        <strong>Token in Storage:</strong> {typeof window !== 'undefined' && Object.keys(localStorage).some(k => k.startsWith('__convexAuth')) ? 'Yes' : 'No'}
      </div>
      <div className="text-[10px] text-gray-500 break-all">
        Keys: {typeof window !== 'undefined' ? Object.keys(localStorage).filter(k => k.toLowerCase().includes('convex')).join(', ') : ''}
      </div>
    </CardContent>
  </Card>
));

DebugContent.displayName = 'DebugContent';

const AuthDebugPanel = React.memo(() => {
  const { currentUser, isLoggedIn, isLoading, isInitialized } = useAuth();
  const { isAuthenticated } = useConvexAuth();

  /* New Clear Auth Logic */
  const clearAuth = () => {
    if (typeof window === 'undefined') return;
    Object.keys(localStorage).forEach(key => {
      if (key.includes('convex') || key.includes('auth')) {
        localStorage.removeItem(key);
      }
    });
    window.location.reload();
  };

  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <>
      <DebugContent
        isLoggedIn={isLoggedIn}
        isLoading={isLoading}
        isInitialized={isInitialized}
        currentUser={currentUser}
        serverIsAuthed={isAuthenticated}
      />
      <div className="fixed bottom-4 right-4 mt-2 flex flex-col items-end gap-1">
        <div className="text-[10px] text-gray-600 bg-white/80 rounded px-2 py-1 border shadow-sm">
          Server: Authed:{String(isAuthenticated)} | PO: {currentUser ? 'Yes' : 'No'}
        </div>
        <div className="text-[10px] text-gray-600 bg-white/80 rounded px-2 py-1 border shadow-sm max-w-[200px] truncate">
          URL: {import.meta.env.VITE_CONVEX_URL || 'Missing'}
        </div>
        <button
          onClick={clearAuth}
          className="bg-red-500 hover:bg-red-600 text-white text-[10px] px-2 py-1 rounded shadow transition-colors"
        >
          Reset Auth & Reload
        </button>
      </div>
    </>
  );
});

AuthDebugPanel.displayName = 'AuthDebugPanel';

export default AuthDebugPanel;
