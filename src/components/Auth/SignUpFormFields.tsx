
import React from 'react';
import FormInputWithIcon from './FormInputWithIcon';
import { Mail, Key, User } from 'lucide-react';

interface SignUpFormValues {
  username: string;
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface SignUpFormFieldsProps {
  formValues: SignUpFormValues;
  onValueChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSubmitting: boolean;
}

const SignUpFormFields: React.FC<SignUpFormFieldsProps> = ({
  formValues,
  onValueChange,
  isSubmitting
}) => {
  return (
    <div className="space-y-4">
      <FormInputWithIcon
        id="username"
        name="username"
        label="Username"
        placeholder="Pick a username"
        value={formValues.username}
        onChange={onValueChange}
        disabled={isSubmitting}
        required
        Icon={User}
      />
      
      <FormInputWithIcon
        id="displayName"
        name="displayName"
        label="Display Name"
        placeholder="How should we call you?"
        value={formValues.displayName}
        onChange={onValueChange}
        disabled={isSubmitting}
        required
        Icon={User}
      />
      
      <FormInputWithIcon
        id="email"
        name="email"
        label="Email"
        placeholder="your@email.com"
        type="email"
        value={formValues.email}
        onChange={onValueChange}
        disabled={isSubmitting}
        required
        Icon={Mail}
      />
      
      <FormInputWithIcon
        id="password"
        name="password"
        label="Password"
        placeholder="Create a password"
        type="password"
        value={formValues.password}
        onChange={onValueChange}
        disabled={isSubmitting}
        required
        Icon={Key}
      />
      
      <FormInputWithIcon
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm Password"
        placeholder="Confirm your password"
        type="password"
        value={formValues.confirmPassword}
        onChange={onValueChange}
        disabled={isSubmitting}
        required
        Icon={Key}
      />
    </div>
  );
};

export default SignUpFormFields;
