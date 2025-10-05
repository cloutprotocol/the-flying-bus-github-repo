
import React from 'react';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

const AuthCardHeader: React.FC = () => {
  return (
    <CardHeader className="space-y-1 text-center">
      <div className="flex justify-center mb-2">
        <div className="bg-orange-100 p-3 rounded-full">
          <BookOpen className="w-6 h-6 text-flyingbus-orange" />
        </div>
      </div>
      <CardTitle className="text-2xl">Join The Flying Bus</CardTitle>
      <CardDescription>
        Create an account to comment on articles and access reader features
      </CardDescription>
    </CardHeader>
  );
};

export default AuthCardHeader;
