
import React, { useState } from 'react';
import { User, LogIn, LogOut, Check, X, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const AuthDebugPanel = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { currentUser, isLoggedIn, isLoading, session } = useAuth();

  return (
    <div className="bg-slate-100 border-b border-slate-200 w-full py-1 px-4 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Auth Debug:</span>
          {isLoading ? (
            <span className="flex items-center gap-1 text-yellow-600">
              <Info className="h-3 w-3" /> Loading
            </span>
          ) : isLoggedIn ? (
            <span className="flex items-center gap-1 text-green-600">
              <Check className="h-3 w-3" /> Logged In ({currentUser?.username})
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-600">
              <X className="h-3 w-3" /> Not Logged In
            </span>
          )}
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-5 text-xs" 
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Less' : 'More'} details
        </Button>
      </div>
      
      {isExpanded && (
        <div className="mt-2 mb-1 space-y-1 bg-white p-2 rounded text-slate-800">
          <div>
            <span className="font-semibold">Status: </span>
            {isLoggedIn ? (
              <span className="text-green-600">Authenticated</span>
            ) : (
              <span className="text-red-600">Not Authenticated</span>
            )}
          </div>
          
          {isLoggedIn && currentUser && (
            <>
              <div>
                <span className="font-semibold">User: </span>
                {currentUser.username} ({currentUser.displayName})
              </div>
              <div>
                <span className="font-semibold">Role: </span>
                {currentUser.role}
              </div>
              <div>
                <span className="font-semibold">ID: </span>
                {currentUser.id.substring(0, 8)}...
              </div>
              <div>
                <span className="font-semibold">Session: </span>
                {session ? (
                  <span className="text-green-600">Active</span>
                ) : (
                  <span className="text-red-600">Missing</span>
                )}
              </div>
            </>
          )}
          
          <div className="text-gray-500 italic">
            This debug panel is only visible during development.
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthDebugPanel;
