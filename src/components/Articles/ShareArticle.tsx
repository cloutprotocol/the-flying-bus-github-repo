
import React, { useState } from 'react';
import { Facebook, Twitter, Linkedin, Mail, Link, Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/use-toast';
import logger, { LogSource } from '@/utils/loggerService';

interface ShareArticleProps {
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
}

/**
 * Social sharing component for articles
 */
const ShareArticle: React.FC<ShareArticleProps> = ({
  url,
  title,
  description = '',
  imageUrl = ''
}) => {
  const [copied, setCopied] = useState(false);
  
  // Format the URL to be shared
  const shareUrl = url.startsWith('http') ? url : window.location.origin + url;
  
  // Social sharing URLs
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`;
  const linkedinUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(description)}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${description}\n\n${shareUrl}`)}`;

  // Log share event
  const logShare = (platform: string) => {
    logger.info(
      LogSource.CLIENT, 
      `Article shared on ${platform}`, 
      { url: shareUrl, title, platform }
    );
  };

  // Handle sharing via specific platform
  const handleShare = (platform: string, shareUrl: string) => {
    window.open(shareUrl, '_blank', 'width=600,height=400');
    logShare(platform);
    
    toast({
      title: "Shared!",
      description: `Article shared on ${platform}`,
    });
  };

  // Copy link to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      
      toast({
        title: "Link Copied!",
        description: "Article link copied to clipboard",
      });
      
      logShare('clipboard');
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard",
        variant: "destructive"
      });
      
      logger.error(
        LogSource.CLIENT,
        "Failed to copy link to clipboard",
        err
      );
    }
  };

  // Use native share if available
  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title,
        text: description,
        url: shareUrl,
      })
      .then(() => logShare('native'))
      .catch((error) => {
        logger.error(
          LogSource.CLIENT,
          "Error sharing via native share API",
          error
        );
      });
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-flyingbus-muted-text">Share:</span>
      
      {/* Facebook */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="rounded-full h-8 w-8 transition-transform hover:scale-105 active:scale-95 hover:bg-blue-100"
        onClick={() => handleShare('Facebook', facebookUrl)}
        aria-label="Share on Facebook"
      >
        <Facebook size={16} className="text-[#1877F2]" />
      </Button>
      
      {/* Twitter */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="rounded-full h-8 w-8 transition-transform hover:scale-105 active:scale-95 hover:bg-blue-100"
        onClick={() => handleShare('Twitter', twitterUrl)}
        aria-label="Share on Twitter"
      >
        <Twitter size={16} className="text-[#1DA1F2]" />
      </Button>
      
      {/* LinkedIn */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="rounded-full h-8 w-8 transition-transform hover:scale-105 active:scale-95 hover:bg-blue-100"
        onClick={() => handleShare('LinkedIn', linkedinUrl)}
        aria-label="Share on LinkedIn"
      >
        <Linkedin size={16} className="text-[#0A66C2]" />
      </Button>
      
      {/* Email */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="rounded-full h-8 w-8 transition-transform hover:scale-105 active:scale-95 hover:bg-gray-100"
        onClick={() => handleShare('Email', mailUrl)}
        aria-label="Share via Email"
      >
        <Mail size={16} />
      </Button>

      {/* Copy Link */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="rounded-full h-8 w-8 transition-transform hover:scale-105 active:scale-95 hover:bg-gray-100"
        onClick={copyToClipboard}
        aria-label="Copy link"
      >
        {copied ? <Check size={16} className="text-green-500" /> : <Link size={16} />}
      </Button>
      
      {/* Native Share - only on mobile */}
      {navigator.share && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full h-8 w-8 transition-transform hover:scale-105 active:scale-95 hover:bg-gray-100 sm:hidden"
          onClick={handleNativeShare}
          aria-label="Share"
        >
          <Share2 size={16} />
        </Button>
      )}

      {/* More options dropdown (for future expansion) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full h-8 w-8 transition-transform hover:scale-105 active:scale-95 hover:bg-gray-100"
            aria-label="More sharing options"
          >
            <Share2 size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => copyToClipboard()}>
            <Link className="mr-2" size={16} />
            Copy link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleShare('Email', mailUrl)}>
            <Mail className="mr-2" size={16} />
            Email
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ShareArticle;
