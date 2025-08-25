/**
 * CAPTCHA Service for protecting forms from automated submissions
 * Uses a simple mathematical challenge for now, can be extended to use reCAPTCHA or other services
 */

export interface CaptchaChallenge {
  id: string;
  question: string;
  answer: number;
  expiresAt: Date;
}

export interface CaptchaVerification {
  challengeId: string;
  userAnswer: string;
}

export interface CaptchaResult {
  success: boolean;
  error?: string;
  challenge?: CaptchaChallenge;
}

export class CaptchaService {
  private static challenges = new Map<string, CaptchaChallenge>();
  private static readonly EXPIRY_MINUTES = 10;
  private static readonly MAX_CHALLENGES_PER_SESSION = 10;

  /**
   * Generate a new CAPTCHA challenge
   */
  static generateChallenge(): CaptchaResult {
    try {
      // Clean up expired challenges
      this.cleanupExpiredChallenges();

      // Limit challenges per session to prevent memory issues
      if (this.challenges.size >= this.MAX_CHALLENGES_PER_SESSION) {
        this.cleanupOldestChallenges();
      }

      // Generate simple math challenge
      const num1 = Math.floor(Math.random() * 10) + 1;
      const num2 = Math.floor(Math.random() * 10) + 1;
      const operations = ['+', '-', '*'];
      const operation = operations[Math.floor(Math.random() * operations.length)];
      
      let answer: number;
      let question: string;

      switch (operation) {
        case '+':
          answer = num1 + num2;
          question = `What is ${num1} + ${num2}?`;
          break;
        case '-':
          // Ensure positive result
          const larger = Math.max(num1, num2);
          const smaller = Math.min(num1, num2);
          answer = larger - smaller;
          question = `What is ${larger} - ${smaller}?`;
          break;
        case '*':
          // Use smaller numbers for multiplication
          const smallNum1 = Math.floor(Math.random() * 5) + 1;
          const smallNum2 = Math.floor(Math.random() * 5) + 1;
          answer = smallNum1 * smallNum2;
          question = `What is ${smallNum1} × ${smallNum2}?`;
          break;
        default:
          answer = num1 + num2;
          question = `What is ${num1} + ${num2}?`;
      }

      const challenge: CaptchaChallenge = {
        id: this.generateChallengeId(),
        question,
        answer,
        expiresAt: new Date(Date.now() + this.EXPIRY_MINUTES * 60 * 1000)
      };

      this.challenges.set(challenge.id, challenge);

      return {
        success: true,
        challenge: {
          id: challenge.id,
          question: challenge.question,
          answer: 0, // Don't send answer to client
          expiresAt: challenge.expiresAt
        }
      };
    } catch (error) {
      console.error('Error generating CAPTCHA challenge:', error);
      return {
        success: false,
        error: 'Failed to generate CAPTCHA challenge'
      };
    }
  }

  /**
   * Verify a CAPTCHA response
   */
  static verifyCaptcha(verification: CaptchaVerification): CaptchaResult {
    try {
      const { challengeId, userAnswer } = verification;

      // Validate input
      if (!challengeId || !userAnswer) {
        return {
          success: false,
          error: 'Challenge ID and answer are required'
        };
      }

      // Find the challenge
      const challenge = this.challenges.get(challengeId);
      if (!challenge) {
        return {
          success: false,
          error: 'Invalid or expired CAPTCHA challenge'
        };
      }

      // Check if challenge has expired
      if (new Date() > challenge.expiresAt) {
        this.challenges.delete(challengeId);
        return {
          success: false,
          error: 'CAPTCHA challenge has expired'
        };
      }

      // Verify the answer
      const numericAnswer = parseInt(userAnswer.trim(), 10);
      if (isNaN(numericAnswer)) {
        return {
          success: false,
          error: 'Please enter a valid number'
        };
      }

      const isCorrect = numericAnswer === challenge.answer;
      
      // Remove challenge after verification attempt (one-time use)
      this.challenges.delete(challengeId);

      if (isCorrect) {
        return { success: true };
      } else {
        return {
          success: false,
          error: 'Incorrect answer. Please try again.'
        };
      }
    } catch (error) {
      console.error('Error verifying CAPTCHA:', error);
      return {
        success: false,
        error: 'Failed to verify CAPTCHA'
      };
    }
  }

  /**
   * Generate a unique challenge ID
   */
  private static generateChallengeId(): string {
    const timestamp = Date.now().toString(36);
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    const randomString = Array.from(randomBytes, byte => byte.toString(36)).join('');
    return `${timestamp}-${randomString}`;
  }

  /**
   * Clean up expired challenges
   */
  private static cleanupExpiredChallenges(): void {
    const now = new Date();
    for (const [id, challenge] of this.challenges.entries()) {
      if (now > challenge.expiresAt) {
        this.challenges.delete(id);
      }
    }
  }

  /**
   * Clean up oldest challenges when limit is reached
   */
  private static cleanupOldestChallenges(): void {
    const entries = Array.from(this.challenges.entries());
    entries.sort((a, b) => a[1].expiresAt.getTime() - b[1].expiresAt.getTime());
    
    // Remove oldest half
    const toRemove = Math.floor(entries.length / 2);
    for (let i = 0; i < toRemove; i++) {
      this.challenges.delete(entries[i][0]);
    }
  }

  /**
   * Get challenge statistics (for debugging/monitoring)
   */
  static getStats(): { activeChallenges: number; oldestChallenge?: Date } {
    this.cleanupExpiredChallenges();
    
    const challenges = Array.from(this.challenges.values());
    const oldestChallenge = challenges.length > 0 
      ? new Date(Math.min(...challenges.map(c => c.expiresAt.getTime())))
      : undefined;

    return {
      activeChallenges: challenges.length,
      oldestChallenge
    };
  }
}

export default CaptchaService;