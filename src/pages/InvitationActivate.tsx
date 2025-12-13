import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { validateInvitationToken, findUserByEmail, type InvitationTokenData } from '@/services/invitationConvexService';

type ValidationState = 'loading' | 'valid' | 'invalid' | 'expired' | 'used' | 'error';

interface ValidationResult {
  state: ValidationState;
  invitationData?: InvitationTokenData;
  userExists?: boolean;
  error?: string;
}

const InvitationActivate = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [validationResult, setValidationResult] = useState<ValidationResult>({ state: 'loading' });

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setValidationResult({
          state: 'invalid',
          error: 'No invitation token provided'
        });
        return;
      }

      try {
        // Validate the token
        const tokenResult = await validateInvitationToken(token, email || undefined);

        if (tokenResult.error) {
          // Determine the specific error type
          const errorMessage = tokenResult.error.toLowerCase();
          if (errorMessage.includes('expired')) {
            setValidationResult({ state: 'expired', error: tokenResult.error });
          } else if (errorMessage.includes('used') || errorMessage.includes('already')) {
            setValidationResult({ state: 'used', error: tokenResult.error });
          } else {
            setValidationResult({ state: 'invalid', error: tokenResult.error });
          }
          return;
        }

        if (!tokenResult.data) {
          setValidationResult({
            state: 'invalid',
            error: 'Invalid token data'
          });
          return;
        }

        // Check if user already exists
        const userResult = await findUserByEmail(tokenResult.data.invitation.parent_email);
        const userExists = !!userResult.data;

        setValidationResult({
          state: 'valid',
          invitationData: tokenResult.data,
          userExists
        });

      } catch (error) {
        console.error('Token validation error:', error);
        setValidationResult({
          state: 'error',
          error: 'An unexpected error occurred while validating your invitation'
        });
      }
    };

    validateToken();
  }, [token, email]);

  const handleActivateExistingAccount = () => {
    if (validationResult.invitationData) {
      navigate(`/invitation/activate-account?token=${token}&email=${encodeURIComponent(email || '')}`);
    }
  };

  const handleCreateNewAccount = () => {
    if (validationResult.invitationData) {
      navigate(`/invitation/register?token=${token}&email=${encodeURIComponent(email || '')}`);
    }
  };

  const handleRequestNewInvitation = () => {
    navigate('/request-invitation');
  };

  const renderContent = () => {
    switch (validationResult.state) {
      case 'loading':
        return (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h2 className="text-xl font-semibold mb-2">Validating your invitation...</h2>
            <p className="text-gray-600">Please wait while we verify your invitation token.</p>
          </div>
        );

      case 'valid':
        const { invitationData, userExists } = validationResult;
        return (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Welcome to The Flying Bus!</h2>
            <p className="text-gray-600 mb-6">
              Your invitation for <strong>{invitationData?.invitation.child_name}</strong> has been approved.
            </p>

            <div className="bg-blue-50 p-4 rounded-lg mb-6 text-left">
              <h3 className="font-semibold text-blue-900 mb-2">Invitation Details:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li><strong>Parent:</strong> {invitationData?.invitation.parent_name}</li>
                <li><strong>Child:</strong> {invitationData?.invitation.child_name}</li>
                <li><strong>Email:</strong> {invitationData?.invitation.parent_email}</li>
              </ul>
            </div>

            {userExists ? (
              <div className="space-y-4">
                <p className="text-gray-700">
                  We found an existing account with your email address. Click below to activate your author privileges.
                </p>
                <Button
                  onClick={handleActivateExistingAccount}
                  className="w-full"
                  size="lg"
                >
                  Activate Author Account
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-700">
                  You'll need to create a new account to get started. Your information will be pre-filled for convenience.
                </p>
                <Button
                  onClick={handleCreateNewAccount}
                  className="w-full"
                  size="lg"
                >
                  Create New Account
                </Button>
              </div>
            )}
          </div>
        );

      case 'expired':
        return (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Invitation Expired</h2>
            <p className="text-gray-600 mb-6">
              This invitation link has expired. Invitation links are valid for 7 days from when they're sent.
            </p>
            <div className="bg-orange-50 p-4 rounded-lg mb-6">
              <p className="text-orange-800 text-sm">
                <strong>What can you do?</strong><br />
                You can request a new invitation, and we'll review your request again.
              </p>
            </div>
            <Button
              onClick={handleRequestNewInvitation}
              className="w-full"
              size="lg"
            >
              Request New Invitation
            </Button>
          </div>
        );

      case 'used':
        return (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Invitation Already Used</h2>
            <p className="text-gray-600 mb-6">
              This invitation has already been used to create an account. Each invitation can only be used once.
            </p>
            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <p className="text-green-800 text-sm">
                <strong>Already have an account?</strong><br />
                If you've already created your account, you can sign in to access the author dashboard.
              </p>
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/reader-auth')}
                className="w-full"
                size="lg"
              >
                Sign In to Your Account
              </Button>
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full"
              >
                Go to Homepage
              </Button>
            </div>
          </div>
        );

      case 'invalid':
      case 'error':
      default:
        return (
          <div className="text-center py-8">
            <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Invalid Invitation</h2>
            <p className="text-gray-600 mb-6">
              {validationResult.error || 'This invitation link is not valid or has been corrupted.'}
            </p>
            <div className="bg-red-50 p-4 rounded-lg mb-6">
              <p className="text-red-800 text-sm">
                <strong>What might have happened?</strong><br />
                • The link may have been copied incorrectly<br />
                • The invitation may have been revoked<br />
                • There may be a technical issue
              </p>
            </div>
            <div className="space-y-3">
              <Button
                onClick={handleRequestNewInvitation}
                className="w-full"
                size="lg"
              >
                Request New Invitation
              </Button>
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full"
              >
                Go to Homepage
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-900">
              Invitation Activation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default InvitationActivate;
