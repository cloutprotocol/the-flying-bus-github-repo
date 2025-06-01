
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MapPin, Calendar } from 'lucide-react';
import type { ReaderProfile } from '@/types/ReaderProfile';

interface ProfileHeroProps {
  profile: ReaderProfile;
}

const ProfileHero = ({ profile }: ProfileHeroProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  // SVG pattern for background
  const dotPattern = "data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E";

  return (
    <Card className="relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 opacity-90" />
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("${dotPattern}")`,
          backgroundRepeat: 'repeat'
        }}
      />
      
      <div className="relative p-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
              <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
              <AvatarFallback className="bg-white text-purple-600 text-2xl font-bold">
                {getInitials(profile.display_name)}
              </AvatarFallback>
            </Avatar>
            {/* Future badge indicator */}
            <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-2 shadow-lg">
              <span className="text-lg">🏆</span>
            </div>
          </div>

          {/* Profile Info */}
          <div className="text-center md:text-left flex-1 text-white">
            <h1 className="text-4xl font-bold mb-2">{profile.display_name}</h1>
            <p className="text-xl opacity-90 mb-2">@{profile.username}</p>
            
            {profile.public_bio && (
              <p className="text-lg opacity-80 mb-4 max-w-2xl">
                {profile.public_bio}
              </p>
            )}

            <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start">
              {profile.created_at && (
                <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Joined {formatDate(profile.created_at)}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
                <span className="text-sm">Young Journalist</span>
              </div>
            </div>

            {/* Favorite Categories */}
            {profile.favorite_categories && profile.favorite_categories.length > 0 && (
              <div className="mt-4">
                <p className="text-sm opacity-80 mb-2">Favorite Topics:</p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  {profile.favorite_categories.map((category) => (
                    <Badge 
                      key={category} 
                      variant="secondary" 
                      className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ProfileHero;
