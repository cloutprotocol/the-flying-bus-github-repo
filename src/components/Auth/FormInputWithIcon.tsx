
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LucideIcon } from 'lucide-react';

interface FormInputWithIconProps {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  Icon: LucideIcon;
}

const FormInputWithIcon: React.FC<FormInputWithIconProps> = ({
  id,
  name,
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  disabled = false,
  required = false,
  Icon
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
        <Input 
          id={id} 
          name={name}
          type={type}
          placeholder={placeholder} 
          className="pl-10"
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
        />
      </div>
    </div>
  );
};

export default FormInputWithIcon;
