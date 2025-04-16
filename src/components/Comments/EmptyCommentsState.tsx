
import React from 'react';
import { UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DrawerAuth } from '@/components/ui/drawer-auth';

const EmptyCommentsState: React.FC = () => {
  return (
    <div className="text-center py-8 text-gray-500">
      <p className="mb-4">No comments yet. Be the first to comment!</p>
      <DrawerAuth 
        triggerComponent={
          <Button variant="outline" size="sm" className="inline-flex items-center gap-2">
            <UserRound className="h-4 w-4" />
            Create an account to join the discussion
          </Button>
        }
        defaultTab="sign-up"
      />
    </div>
  );
};

export default EmptyCommentsState;
