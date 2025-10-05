
import React, { useState } from 'react';

interface FeatureArticleImageProps {
  imageUrl?: string;
  title: string;
}

const FeatureArticleImage: React.FC<FeatureArticleImageProps> = ({ imageUrl, title }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  // Show fallback if no imageUrl provided or image failed to load
  const showFallback = !imageUrl || imageError;

  return (
    <div className="relative w-full" style={{ 
      height: "calc(100svh - var(--header-height) - 5rem)", 
      minHeight: "450px", 
      maxHeight: "700px" 
    }}>
      {showFallback ? (
        // Fallback background with gradient
        <div className="absolute inset-0 bg-gradient-to-br from-flyingbus-blue via-purple-600 to-pink-500" />
      ) : (
        <>
          {imageLoading && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}
          <img
            src={imageUrl}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
            onError={handleImageError}
            onLoad={handleImageLoad}
            style={{ display: imageLoading ? 'none' : 'block' }}
          />
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
      
      {/* Optional: Show a subtle indicator when using fallback */}
      {showFallback && (
        <div className="absolute top-4 right-4 text-white/60 text-xs">
          📰
        </div>
      )}
    </div>
  );
};

export default FeatureArticleImage;
