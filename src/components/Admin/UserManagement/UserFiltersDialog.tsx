
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface UserFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRoles: string[];
  onApplyFilters: (roles: string[]) => void;
}

const UserFiltersDialog: React.FC<UserFiltersDialogProps> = ({
  open,
  onOpenChange,
  selectedRoles,
  onApplyFilters,
}) => {
  const [roles, setRoles] = useState<string[]>([...selectedRoles]);
  
  // Reset internal state when dialog opens
  useEffect(() => {
    if (open) {
      setRoles([...selectedRoles]);
    }
  }, [open, selectedRoles]);
  
  const handleRoleToggle = (role: string) => {
    setRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role) 
        : [...prev, role]
    );
  };
  
  const handleApply = () => {
    onApplyFilters(roles);
    onOpenChange(false);
  };
  
  const handleReset = () => {
    setRoles([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filter Users</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium leading-none">User Role</h3>
            <div className="grid grid-cols-1 gap-3">
              {['reader', 'author', 'moderator', 'admin'].map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`role-${role}`} 
                    checked={roles.includes(role)}
                    onCheckedChange={() => handleRoleToggle(role)}
                  />
                  <Label 
                    htmlFor={`role-${role}`}
                    className="text-sm font-normal capitalize cursor-pointer"
                  >
                    {role}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex space-x-2 justify-between sm:justify-between">
          <Button type="button" variant="outline" onClick={handleReset}>
            Reset Filters
          </Button>
          <Button type="button" onClick={handleApply}>
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserFiltersDialog;
