
import React from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import HeroSection from '@/components/About/HeroSection';
import BenefitsSection from '@/components/About/BenefitsSection';
import SafetySection from '@/components/About/SafetySection';
import HowItWorksSection from '@/components/About/HowItWorksSection';
import CategoriesSection from '@/components/About/CategoriesSection';
import CallToActionSection from '@/components/About/CallToActionSection';

const About = () => {
  return (
    <MainLayout fullWidth={true}>
      <div className="w-full">
        <HeroSection />
        <BenefitsSection />
        <SafetySection />
        <HowItWorksSection />
        <CategoriesSection />
        <CallToActionSection />
      </div>
    </MainLayout>
  );
};

export default About;
