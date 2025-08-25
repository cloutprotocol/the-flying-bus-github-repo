import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, AlertCircle, Clock } from 'lucide-react';

type ErrorType = 'invalid' | 'expired' | 'used' | 'generic';

interface ErrorConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  details: string;
  primaryAction: {
    text: string;
    action: () => void;
  };
  secondaryAction?: {
    text: string;
    action: () => void;
  };
}

const InvitationError = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const errorType = (searchParams.get('type') as ErrorType) || 'generic';
  const message = searchParams.get('message') || '';

  const getErrorConfig = (type: ErrorType): ErrorConfig => {
    const baseActions = {
      requestNew: () => navigate('/request-invitation'),
      goHome: () => navigate('/'),
      signIn: () => navigate('/reader-auth')
    };

    switch (type) {
      case 'expired':
        return {
          icon: <AlertCircle className="h-12 w-12 text-orange-600" />,
          title: 'Invitation Expired',
          description: 'This invitation link has expired. Invitation links are valid for 7 days from when they\'re sent.',
          details: 'What can you do? You can request a new invitation, and we\'ll review your request again.',
          primaryAction: {
            text: 'Request New Invitation',
            action: baseActions.requestNew
          },
          secondaryAction: {
            text: 'Go to Homepage',
            action: baseActions.goHome
          }
        };

      case 'used':
        return {
          icon: <Clock className="h-12 w-12 text-blue-600" />,
          title: 'Invitation Already Used',
          description: 'This invitation has already been used to create an account. Each invitation can only be used once.',
          details: 'Already have an account? If you\'ve already created your account, you can sign in to access the author dashboard.',
          primaryAction: {
            text: 'Sign In to Your Account',
            action: baseActions.signIn
          },
          secondaryAction: {
            text: 'Go to Homepage',
            action: baseActions.goHome
          }
        };

      case 'invalid':
        return {
          icon: <XCircle className="h-12 w-12 text-red-600" />,
          title: 'Invalid Invitation',
          description: message || 'This invitation link is not valid or has been corrupted.',
          details: 'What might have happened?\n• The link may have been copied incorrectly\n• The invitation may have been revoked\n• There may be a technical issue',
          primaryAction: {
            text: 'Request New Invitation',
            action: baseActions.requestNew
          },
          secondaryAction: {
            text: 'Go to Homepage',
            action: baseActions.goHome
          }
        };

      case 'generic':
      default:
        return {
          icon: <XCircle className="h-12 w-12 text-red-600" />,
          title: 'Invitation Error',
          description: message || 'There was an error processing your invitation.',
          details: 'Please try again or request a new invitation if the problem persists.',
          primaryAction: {
            text: 'Request New Invitation',
            action: baseActions.requestNew
          },
          secondaryAction: {
            text: 'Go to Homepage',
            action: baseActions.goHome
          }
        };
    }
  };

  const config = getErrorConfig(errorType);

  const getBackgroundColor = (type: ErrorType): string => {
    switch (type) {
      case 'expired':
        return 'bg-orange-50';
      case 'used':
        return 'bg-blue-50';
      case 'invalid':
      case 'generic':
      default:
        return 'bg-red-50';
    }
  };

  const getTextColor = (type: ErrorType): string => {
    switch (type) {
      case 'expired':
        return 'text-orange-800';
      case 'used':
        return 'text-blue-800';
      case 'invalid':
      case 'generic':
      default:
        return 'text-red-800';
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-900">
              Invitation Issue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="mx-auto mb-4">
                {config.icon}
              </div>
              
              <h2 className="text-2xl font-bold mb-4">{config.title}</h2>
              
              <p className="text-gray-600 mb-6">
                {config.description}
              </p>
              
              <div className={`${getBackgroundColor(errorType)} p-4 rounded-lg mb-6`}>
                <p className={`${getTextColor(errorType)} text-sm whitespace-pre-line`}>
                  <strong>
                    {errorType === 'used' ? 'Already have an account?' : 
                     errorType === 'expired' ? 'What can you do?' : 
                     'What might have happened?'}
                  </strong><br />
                  {config.details}
                </p>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={config.primaryAction.action}
                  className="w-full"
                  size="lg"
                >
                  {config.primaryAction.text}
                </Button>
                
                {config.secondaryAction && (
                  <Button 
                    onClick={config.secondaryAction.action}
                    variant="outline"
                    className="w-full"
                  >
                    {config.secondaryAction.text}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default InvitationError;