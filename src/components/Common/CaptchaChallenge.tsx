import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Shield } from 'lucide-react';
import CaptchaService, { CaptchaChallenge } from '@/services/captchaService';

interface CaptchaChallengeProps {
  onVerified: (verified: boolean) => void;
  onChallengeGenerated?: (challengeId: string) => void;
  className?: string;
  required?: boolean;
}

export const CaptchaChallenge: React.FC<CaptchaChallengeProps> = ({
  onVerified,
  onChallengeGenerated,
  className = '',
  required = true
}) => {
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Generate initial challenge
  useEffect(() => {
    generateNewChallenge();
  }, []);

  const generateNewChallenge = () => {
    setIsLoading(true);
    setError(null);
    setUserAnswer('');
    setIsVerified(false);
    
    try {
      const result = CaptchaService.generateChallenge();
      
      if (result.success && result.challenge) {
        setChallenge(result.challenge);
        onChallengeGenerated?.(result.challenge.id);
        onVerified(false);
      } else {
        setError(result.error || 'Failed to generate CAPTCHA');
      }
    } catch (error) {
      console.error('Error generating CAPTCHA:', error);
      setError('Failed to generate CAPTCHA challenge');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserAnswer(value);
    setError(null);
    
    // Auto-verify when user types an answer
    if (value.trim() && challenge) {
      verifyAnswer(value.trim());
    }
  };

  const verifyAnswer = (answer: string) => {
    if (!challenge) {
      setError('No CAPTCHA challenge available');
      return;
    }

    try {
      const result = CaptchaService.verifyCaptcha({
        challengeId: challenge.id,
        userAnswer: answer
      });

      if (result.success) {
        setIsVerified(true);
        setError(null);
        onVerified(true);
      } else {
        setIsVerified(false);
        setError(result.error || 'Verification failed');
        onVerified(false);
        
        // Generate new challenge after failed attempt
        setTimeout(() => {
          generateNewChallenge();
        }, 1500);
      }
    } catch (error) {
      console.error('Error verifying CAPTCHA:', error);
      setError('Failed to verify CAPTCHA');
      setIsVerified(false);
      onVerified(false);
    }
  };

  const handleRefresh = () => {
    generateNewChallenge();
  };

  if (!challenge && !isLoading) {
    return (
      <Alert className={className}>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Failed to load security verification. Please refresh the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-blue-600" />
        <Label className="text-sm font-medium">
          Security Verification {required && <span className="text-red-500">*</span>}
        </Label>
      </div>
      
      {challenge && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md border">
            <span className="text-sm font-medium text-gray-700">
              {challenge.question}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="ml-auto h-6 w-6 p-0"
              title="Generate new challenge"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={userAnswer}
              onChange={handleAnswerChange}
              placeholder="Enter your answer"
              className={`flex-1 ${
                isVerified 
                  ? 'border-green-500 bg-green-50' 
                  : error 
                  ? 'border-red-500 bg-red-50' 
                  : ''
              }`}
              disabled={isLoading || isVerified}
              autoComplete="off"
              inputMode="numeric"
            />
            {isVerified && (
              <div className="text-green-600 text-sm font-medium">
                ✓ Verified
              </div>
            )}
          </div>
        </div>
      )}
      
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      {isLoading && (
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Loading security challenge...
        </div>
      )}
    </div>
  );
};

export default CaptchaChallenge;