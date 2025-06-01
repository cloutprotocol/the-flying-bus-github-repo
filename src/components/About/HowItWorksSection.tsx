
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { UserPlus, PenTool, Eye, Coins } from 'lucide-react';

const steps = [
  {
    icon: UserPlus,
    title: "Get Invited",
    description: "Receive an invitation from one of our administrators to join the community.",
    step: "01"
  },
  {
    icon: PenTool,
    title: "Write & Create",
    description: "Start writing articles in your favorite categories and participate in discussions.",
    step: "02"
  },
  {
    icon: Eye,
    title: "Review Process",
    description: "Our moderators review your content to ensure quality and safety standards.",
    step: "03"
  },
  {
    icon: Coins,
    title: "Earn Rewards",
    description: "Get TFB tokens for published articles, quality comments, and community engagement.",
    step: "04"
  }
];

const HowItWorksSection = () => {
  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-flyingbus-purple mb-4">
            How It Works
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Join our community of young journalists in four simple steps and start 
            your journey towards becoming a published writer.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="absolute top-4 right-4 text-4xl font-bold text-flyingbus-purple/10 group-hover:text-flyingbus-purple/20 transition-colors">
                  {step.step}
                </div>
                <div className="mb-4">
                  <div className="mx-auto w-16 h-16 bg-flyingbus-purple/10 rounded-full flex items-center justify-center group-hover:bg-flyingbus-purple/20 transition-colors">
                    <step.icon className="h-8 w-8 text-flyingbus-purple" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-3 text-gray-900">
                  {step.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
