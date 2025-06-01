import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Eye, Lock, UserCheck } from 'lucide-react';

const safetyFeatures = [
  {
    icon: Shield,
    title: "COPPA/GDPR Compliant",
    description: "Full compliance with child privacy laws and data protection regulations."
  },
  {
    icon: Eye,
    title: "Content Moderation",
    description: "All articles and comments are reviewed by trained moderators before publication."
  },
  {
    icon: Lock,
    title: "Secure Platform",
    description: "Advanced security measures protect user data and ensure safe interactions."
  },
  {
    icon: UserCheck,
    title: "Invitation System",
    description: "New journalists join through administrator invitations, ensuring quality community."
  }
];

const SafetySection = () => {
  return (
    <section className="py-16 md:py-20 bg-gradient-to-br from-flyingbus-green/5 to-flyingbus-blue/5">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="section-headline">
            Safety First, Always
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Parents can trust that their children are in a secure, monitored environment 
            designed specifically for young learners.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {safetyFeatures.map((feature, index) => (
            <Card key={index} className="bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-3">
                  <div className="p-2 rounded-lg bg-flyingbus-green/10">
                    <feature.icon className="h-6 w-6 text-flyingbus-green" />
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h3 className="subsection-headline">For Parents</h3>
          <div className="prose prose-lg max-w-none text-gray-700">
            <p className="mb-4">
              The Flying Bus provides a nurturing digital environment where children can develop 
              essential skills while staying safe. Our comprehensive safety measures include:
            </p>
            <ul className="space-y-2 mb-4">
              <li>• Pre-publication content review by trained moderators</li>
              <li>• Secure user authentication and data protection</li>
              <li>• Age-appropriate content guidelines and enforcement</li>
              <li>• Regular safety audits and community guidelines updates</li>
              <li>• Direct communication channels for parent concerns</li>
            </ul>
            <p>
              We believe in transparency and maintain open communication with parents about 
              our safety practices and their child's activity on the platform.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SafetySection;
