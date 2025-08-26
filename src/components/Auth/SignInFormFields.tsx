
import React from 'react';
import FormInputWithIcon from './FormInputWithIcon';
import { Mail, Key } from 'lucide-react';

interface SignInFormValues {
  email: string;
  password: string;
}

interface SignInFormFieldsProps {
  formValues: SignInFormValues;
  onValueChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSubmitting: boolean;
}

const SignInFormFields: React.FC<SignInFormFieldsProps> = ({
  formValues,
  onValueChange,
  isSubmitting
}) => {
  return (
    <div className="space-y-4">
      <FormInputWithIcon
        id="signin-email"
        name="email"
        label="Email"
        placeholder="Your email"
        type="email"
        value={formValues.email}
        onChange={onValueChange}
        disabled={isSubmitting}
        required
        Icon={Mail}
      />
      
      <FormInputWithIcon
        id="signin-password"
        name="password"
        label="Password"
        placeholder="Your password"
        type="password"
        value={formValues.password}
        onChange={onValueChange}
        disabled={isSubmitting}
        required
        Icon={Key}
      />
    </div>
  );
};

export default SignInFormFields;
