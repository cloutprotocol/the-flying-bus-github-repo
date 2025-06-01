
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ReaderProfile } from '@/types/ReaderProfile';

interface ProfileEditHeaderProps {
  profile: ReaderProfile;
  onAvatarChange: () => void;
}

const ProfileEditHeader: React.FC<ProfileEditHeaderProps> = ({ 
  profile, 
  onAvatarChange 
}) => {
  return (
    <div className="relative mb-16">
      {/* Gradient background with adequate height */}
      <div className="h-52 rounded-b-3xl bg-gradient-to-r from-[#D3E4FD] to-[#E5DEFF]">
        {/* Back Button */}
        <div className="absolute top-4 left-4">
          <Link 
            to={`/profile/${profile.username}`}
            className="inline-flex items-center gap-1 bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium text-gray-700 hover:bg-white/90 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Profile
          </Link>
        </div>
      </div>
      
      {/* Profile container with negative margin to create overlap */}
      <div className="absolute left-0 right-0 -mt-16 flex flex-col items-center">
        <div className="relative inline-block">
          <Avatar className="h-32 w-32 border-4 border-white bg-white shadow-md">
            <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
            <AvatarFallback className="text-3xl bg-purple-50 text-purple-700">
              {profile.display_name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute bottom-0 right-0 rounded-full bg-white shadow-sm"
            onClick={onAvatarChange}
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditHeader;
