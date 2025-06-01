
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PenTool, Coins, Users, BookOpen, Shield, Trophy } from 'lucide-react';

const benefits = [
  {
    icon: PenTool,
    title: "Write & Publish",
    description: "Create engaging articles across categories like Headliners, Debates, and Storyboard series.",
    color: "text-flyingbus-purple"
  },
  {
    icon: Coins,
    title: "Earn TFB Tokens",
    description: "Get rewarded with crypto tokens for quality articles, comments, and community participation.",
    color: "text-flyingbus-yellow"
  },
  {
    icon: Users,
    title: "Community Engagement",
    description: "Connect with other young journalists, participate in debates, and build lasting friendships.",
    color: "text-flyingbus-blue"
  },
  {
    icon: BookOpen,
    title: "Digital Literacy",
    description: "Develop essential 21st-century skills in writing, research, and digital communication.",
    color: "text-flyingbus-green"
  },
  {
    icon: Shield,
    title: "Safe Environment",
    description: "COPPA/GDPR compliant platform with moderated content and protected user data.",
    color: "text-flyingbus-red"
  },
  {
    icon: Trophy,
    title: "Recognition & Growth",
    description: "Build a portfolio of published work and gain recognition for journalistic achievements.",
    color: "text-flyingbus-purple"
  }
];

const BenefitsSection = () => {
  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-flyingbus-purple mb-4">
            Why Choose The Flying Bus?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our platform combines journalism education with modern technology to create 
            an engaging and rewarding experience for young writers.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition-colors`}>
                    <benefit.icon className={`h-6 w-6 ${benefit.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2 text-gray-900">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
