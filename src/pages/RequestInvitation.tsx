
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Mail, User, Calendar, MessageCircle } from 'lucide-react';
import { createInvitationRequest } from '@/services/invitationService';

const RequestInvitation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    parentName: '',
    parentEmail: '',
    childName: '',
    childAge: '',
    message: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate age
      const age = parseInt(formData.childAge);
      if (age < 8 || age > 14) {
        toast({
          title: "Invalid Age",
          description: "Child must be between 8-14 years old.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Submit the invitation request
      const result = await createInvitationRequest({
        parent_name: formData.parentName,
        parent_email: formData.parentEmail,
        child_name: formData.childName,
        child_age: age,
        message: formData.message || null
      });

      if (result.error) {
        toast({
          title: "Submission Failed",
          description: result.error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Request Submitted!",
        description: "Your invitation request has been submitted. We'll review it and get back to you soon.",
      });

      // Reset form and redirect
      setFormData({
        parentName: '',
        parentEmail: '',
        childName: '',
        childAge: '',
        message: ''
      });

      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      console.error('Error submitting invitation request:', error);
      toast({
        title: "An error occurred",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
              Request Invitation
            </CardTitle>
            <p className="text-gray-600">
              Get your child started as a young journalist on The Flying Bus
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="parentName">Parent/Guardian Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    id="parentName"
                    name="parentName"
                    type="text"
                    placeholder="Your full name"
                    className="pl-10"
                    value={formData.parentName}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentEmail">Parent/Guardian Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    id="parentEmail"
                    name="parentEmail"
                    type="email"
                    placeholder="your@email.com"
                    className="pl-10"
                    value={formData.parentEmail}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="childName">Child's Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    id="childName"
                    name="childName"
                    type="text"
                    placeholder="Child's full name"
                    className="pl-10"
                    value={formData.childName}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="childAge">Child's Age *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    id="childAge"
                    name="childAge"
                    type="number"
                    min="8"
                    max="14"
                    placeholder="Age (8-14)"
                    className="pl-10"
                    value={formData.childAge}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Children must be between 8-14 years old to participate.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Additional Message (Optional)</Label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-3 text-gray-500 h-4 w-4" />
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Tell us why your child is interested in journalism or any other information you'd like to share..."
                    className="pl-10 min-h-[100px]"
                    value={formData.message}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• We'll review your request within 2-3 business days</li>
                  <li>• If approved, you'll receive an email with signup instructions</li>
                  <li>• Your child will be able to start writing and submitting articles</li>
                  <li>• All content is moderated to ensure safety and quality</li>
                </ul>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
                size="lg"
              >
                {isSubmitting ? 'Submitting Request...' : 'Submit Invitation Request'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default RequestInvitation;
