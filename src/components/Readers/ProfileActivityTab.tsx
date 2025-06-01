
import React from 'react';
import { Flame, MessageSquare, Book } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReaderProfile } from '@/types/ReaderProfile';

interface ProfileActivityTabProps {
  reader: ReaderProfile;
}

const ProfileActivityTab: React.FC<ProfileActivityTabProps> = ({ reader }) => {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Reading Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-xl">
            <div className="h-12 w-12 flex items-center justify-center bg-orange-100 text-orange-500 rounded-full">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Reading Streak</p>
              <p className="text-xl font-medium">0 days</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
            <div className="h-12 w-12 flex items-center justify-center bg-blue-100 text-blue-500 rounded-full">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Comments</p>
              <p className="text-xl font-medium">0 total</p>
            </div>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h3 className="font-medium text-base mb-4">Recent Activity</h3>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="h-9 w-9 flex items-center justify-center bg-purple-100 text-purple-600 rounded-full">
                <Book className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Read an article</p>
                <p className="text-xs text-gray-500">2 days ago</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="h-9 w-9 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Posted a comment</p>
                <p className="text-xs text-gray-500">5 days ago</p>
              </div>
            </div>
          </div>
          
          <p className="text-gray-500 text-sm mt-6">More activity tracking features coming soon!</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileActivityTab;
