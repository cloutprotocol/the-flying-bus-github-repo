
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ReaderProfile } from '@/types/ReaderProfile';

interface ProfileInfoProps {
  reader: ReaderProfile;
}

const ProfileInfo: React.FC<ProfileInfoProps> = ({ reader }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  return (
    <div className="mt-8 px-4 text-center">
      <h1 className="text-2xl font-bold">{reader.display_name}</h1>
      <p className="text-gray-500">@{reader.username}</p>
      <p className="text-sm text-gray-600 mt-1">
        Joined {formatDate(reader.created_at)}
      </p>
      
      {reader.bio && (
        <p className="text-center text-gray-700 max-w-lg mx-auto mt-4">{reader.bio}</p>
      )}
      
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        <Badge 
          variant="outline" 
          className="bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100"
        >
          {reader.role.charAt(0).toUpperCase() + reader.role.slice(1)}
        </Badge>
      </div>
    </div>
  );
};

export default ProfileInfo;
