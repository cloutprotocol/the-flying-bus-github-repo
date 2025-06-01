
import React from 'react';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { Button } from '@/components/ui/button';
import { Coins, PenTool, Shield } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="relative bg-gradient-to-br from-flyingbus-purple/10 via-flyingbus-blue/10 to-flyingbus-green/10 py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-flyingbus-purple">
              The Flying Bus
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 font-medium">
              News for Kids, By Kids
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto space-y-6">
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
              A safe digital newspaper platform where young journalists aged 8-14 can write articles, 
              engage with content, and earn TFB tokens for their contributions while developing 
              critical thinking and digital literacy skills.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 text-sm md:text-base">
              <div className="flex items-center gap-2 bg-white/80 rounded-full px-4 py-2">
                <PenTool className="h-5 w-5 text-flyingbus-purple" />
                <span>Write & Publish</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 rounded-full px-4 py-2">
                <Coins className="h-5 w-5 text-flyingbus-yellow" />
                <span>Earn TFB Tokens</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 rounded-full px-4 py-2">
                <Shield className="h-5 w-5 text-flyingbus-green" />
                <span>Safe Environment</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <RainbowButton className="text-lg px-8 py-3">
              Join Our Community
            </RainbowButton>
            <Button variant="outline" size="lg" className="text-lg px-8 py-3">
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
