
/**
 * Validates sign up form fields
 */
export const validateSignUpForm = (
  password: string,
  confirmPassword: string
): { valid: boolean; errorMessage?: string } => {
  if (password !== confirmPassword) {
    return {
      valid: false,
      errorMessage: "Passwords don't match. Please make sure your passwords match."
    };
  }
  
  return { valid: true };
};
