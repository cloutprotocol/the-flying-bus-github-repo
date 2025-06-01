
import React, { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DrawerSignInForm from "@/components/auth/DrawerSignInForm";
import DrawerSignUpForm from "@/components/auth/DrawerSignUpForm";
import { useAuth } from "@/hooks/useAuth";

interface DrawerAuthProps {
  triggerComponent: React.ReactNode;
  defaultTab?: 'sign-in' | 'sign-up';
}

export function DrawerAuth({ triggerComponent, defaultTab = 'sign-in' }: DrawerAuthProps) {
  const [activeTab, setActiveTab] = useState<'sign-in' | 'sign-up'>(defaultTab);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { isLoggedIn } = useAuth();

  // Close drawer when user successfully logs in
  useEffect(() => {
    if (isLoggedIn && isOpen) {
      console.log('User logged in, closing drawer');
      setIsOpen(false);
    }
  }, [isLoggedIn, isOpen]);

  const handleFormSuccess = () => {
    console.log('Form success callback triggered, closing drawer');
    setIsOpen(false);
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        {triggerComponent}
      </DrawerTrigger>
      <DrawerContent className="bg-white">
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle className="text-gray-900">
              {activeTab === 'sign-in' ? 'Sign In' : 'Create Account'}
            </DrawerTitle>
            <DrawerDescription>
              {activeTab === 'sign-in' 
                ? 'Welcome back! Please sign in to continue.' 
                : 'Join The Flying Bus community!'}
            </DrawerDescription>
          </DrawerHeader>
          
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'sign-in' | 'sign-up')}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="sign-in">Sign In</TabsTrigger>
              <TabsTrigger value="sign-up">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sign-in">
              <DrawerSignInForm 
                isSubmitting={isSubmitting} 
                setIsSubmitting={setIsSubmitting} 
                onSuccess={handleFormSuccess}
              />
            </TabsContent>
            
            <TabsContent value="sign-up">
              <DrawerSignUpForm 
                isSubmitting={isSubmitting} 
                setIsSubmitting={setIsSubmitting}
                onSuccess={handleFormSuccess}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
