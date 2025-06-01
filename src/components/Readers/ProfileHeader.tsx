
import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Share2, Edit, ArrowLeft } from 'lucide-react';
import { ReaderProfile } from '@/types/ReaderProfile';

interface ProfileHeaderProps {
  reader: ReaderProfile;
  isOwnProfile: boolean;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ reader, isOwnProfile }) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  };

  return (
    <div className="relative mb-16">
      {/* Grey background header */}
      <div className="h-52 rounded-b-3xl overflow-hidden relative bg-gray-900">
        {/* Navigation */}
        <div className="absolute top-4 left-4 z-10">
          <Link 
            to="/" 
            className="inline-flex items-center gap-1 bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium text-gray-700 hover:bg-white/90 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
        
        {/* Actions */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          {isOwnProfile && (
            <Link to={`/profile/${reader.username}/edit`}>
              <Button 
                variant="outline"
                size="sm"
                className="flex items-center gap-1 bg-white/70 backdrop-blur-sm border-transparent hover:bg-white/90"
              >
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
            </Link>
          )}
          <Button 
            variant="outline"
            size="sm" 
            className="flex items-center gap-1 bg-white/70 backdrop-blur-sm border-transparent hover:bg-white/90"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>

        {/* Profile Info */}
        <div className="absolute bottom-6 left-6 right-6 z-10">
          <div className="flex items-end gap-4">
            <Avatar className="h-24 w-24 border-4 border-white bg-white shadow-lg">
              <AvatarImage src={reader.avatar_url} alt={reader.display_name} />
              <AvatarFallback className="text-2xl bg-purple-50 text-purple-700">
                {getInitials(reader.display_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 pb-2">
              <h1 className="text-3xl font-bold text-white drop-shadow-lg">
                {reader.display_name}
              </h1>
              <p className="text-white/90 text-lg drop-shadow">
                @{reader.username}
              </p>
              {reader.public_bio && (
                <p className="text-white/80 text-sm mt-1 drop-shadow">
                  {reader.public_bio}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
