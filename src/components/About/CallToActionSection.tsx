
import React from 'react';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { Button } from '@/components/ui/button';
import { ArrowRight, Mail } from 'lucide-react';

const CallToActionSection = () => {
  return (
    <section className="py-16 md:py-20 bg-gradient-to-r from-flyingbus-purple via-flyingbus-blue to-flyingbus-green">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Ready to Start Your Journey?
            </h2>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
              Join our community of young journalists and start earning TFB tokens 
              while developing valuable skills in a safe, supportive environment.
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">
              Getting Started is Easy
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white/90">
              <div className="text-left">
                <h4 className="font-semibold mb-2">For Young Writers (Ages 8-14):</h4>
                <p className="text-sm">Ask a parent or guardian to request an invitation for you to join our platform.</p>
              </div>
              <div className="text-left">
                <h4 className="font-semibold mb-2">For Parents:</h4>
                <p className="text-sm">Contact our administrators to learn about the invitation process and safety measures.</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <RainbowButton className="text-lg px-8 py-3 bg-white text-gray-900 hover:bg-gray-100">
              <Mail className="mr-2 h-5 w-5" />
              Request Invitation
            </RainbowButton>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-3 border-white text-white hover:bg-white hover:text-gray-900"
            >
              Learn More
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallToActionSection;
