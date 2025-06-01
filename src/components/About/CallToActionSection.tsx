
import React from 'react';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { Mail, Users, Shield } from 'lucide-react';

const CallToActionSection = () => {
  return (
    <section className="py-16 md:py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          {/* Header Section - Clean white background */}
          <div className="bg-white px-8 py-12 text-center border-b border-gray-100">
            <div className="space-y-4">
              <h2 className="section-headline text-gray-900">
                Ready to Start Your Journey?
              </h2>
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Join our community of young journalists and start earning TFB tokens 
                while developing valuable skills in a safe, supportive environment.
              </p>
            </div>
          </div>
          
          {/* Getting Started Section - Subtle gradient background */}
          <div className="bg-gradient-to-br from-gray-50 via-flyingbus-blue/5 to-flyingbus-green/5 px-8 py-10">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center justify-center gap-2">
                <Users className="h-6 w-6 text-flyingbus-blue" />
                Getting Started is Easy
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-flyingbus-purple/10 rounded-lg">
                    <Users className="h-5 w-5 text-flyingbus-purple" />
                  </div>
                  <h4 className="font-semibold text-gray-900">For Young Writers (Ages 8-14):</h4>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Ask a parent or guardian to request an invitation for you to join our platform.
                </p>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-flyingbus-green/10 rounded-lg">
                    <Shield className="h-5 w-5 text-flyingbus-green" />
                  </div>
                  <h4 className="font-semibold text-gray-900">For Parents:</h4>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Contact our administrators to learn about the invitation process and safety measures.
                </p>
              </div>
            </div>
            
            {/* Action Button */}
            <div className="flex justify-center">
              <RainbowButton className="text-lg px-8 py-3 text-gray-900 font-semibold">
                <Mail className="mr-2 h-5 w-5" />
                Request Invitation
              </RainbowButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallToActionSection;
