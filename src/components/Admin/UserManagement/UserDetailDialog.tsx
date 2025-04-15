
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ReaderProfile } from '@/types/ReaderProfile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { UserCheck, UserX, Shield, Clock, MessageSquare, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface UserDetailDialogProps {
  user: ReaderProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UserDetailDialog: React.FC<UserDetailDialogProps> = ({
  user,
  open,
  onOpenChange,
}) => {
  const [editedUser, setEditedUser] = useState<ReaderProfile>({...user});
  
  const handleRoleChange = (value: string) => {
    setEditedUser({
      ...editedUser,
      role: value as 'reader' | 'author' | 'moderator' | 'admin'
    });
  };
  
  const handleSaveChanges = () => {
    // In a real app, this would save to the database
    console.log('Saving user changes:', editedUser);
    onOpenChange(false);
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  };
  
  const formatDate = (date?: Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar} alt={user.displayName} />
              <AvatarFallback className="bg-neutral-700 text-white text-lg">
                {getInitials(user.displayName)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-1 text-center sm:text-left">
              <h3 className="font-medium text-lg">{user.displayName}</h3>
              <div className="text-muted-foreground">@{user.username}</div>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-2">
                <Badge variant="outline">{user.role}</Badge>
                {user.badges?.map(badge => (
                  <Badge key={badge} variant="secondary">{badge}</Badge>
                ))}
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input 
                    id="displayName" 
                    value={editedUser.displayName}
                    onChange={(e) => setEditedUser({...editedUser, displayName: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input 
                    id="username" 
                    value={editedUser.username}
                    onChange={(e) => setEditedUser({...editedUser, username: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={editedUser.email}
                    onChange={(e) => setEditedUser({...editedUser, email: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="joined">Joined Date</Label>
                  <Input id="joined" value={formatDate(user.joinedDate)} disabled />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Input 
                    id="bio" 
                    value={editedUser.bio || ''}
                    onChange={(e) => setEditedUser({...editedUser, bio: e.target.value})}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="activity" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-md p-4 flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Reading Streak</div>
                    <div className="text-2xl font-bold">{user.readingStreak || 0} days</div>
                  </div>
                </div>
                
                <div className="bg-muted/50 rounded-md p-4 flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Comments</div>
                    <div className="text-2xl font-bold">{user.commentCount || 0}</div>
                  </div>
                </div>
                
                <div className="bg-muted/50 rounded-md p-4 flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Achievements</div>
                    <div className="text-2xl font-bold">{user.achievements?.length || 0}</div>
                  </div>
                </div>
              </div>
              
              {user.achievements && user.achievements.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Achievements</h4>
                  <div className="flex flex-wrap gap-2">
                    {user.achievements.map(achievement => (
                      <Badge key={achievement} variant="secondary">{achievement}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="permissions" className="space-y-4">
              <div className="space-y-3">
                <Label>User Role</Label>
                <RadioGroup 
                  value={editedUser.role} 
                  onValueChange={handleRoleChange} 
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  <div className="flex items-center space-x-2 rounded-md border p-3">
                    <RadioGroupItem value="reader" id="reader" />
                    <Label htmlFor="reader" className="flex items-center gap-2 font-normal cursor-pointer">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      Reader
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 rounded-md border p-3">
                    <RadioGroupItem value="author" id="author" />
                    <Label htmlFor="author" className="flex items-center gap-2 font-normal cursor-pointer">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      Author
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 rounded-md border p-3">
                    <RadioGroupItem value="moderator" id="moderator" />
                    <Label htmlFor="moderator" className="flex items-center gap-2 font-normal cursor-pointer">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      Moderator
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 rounded-md border p-3">
                    <RadioGroupItem value="admin" id="admin" />
                    <Label htmlFor="admin" className="flex items-center gap-2 font-normal cursor-pointer">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      Administrator
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="flex justify-between pt-4">
                <Button variant="destructive" size="sm" className="gap-1">
                  <UserX className="h-4 w-4" />
                  Disable Account
                </Button>
                
                <Button variant="outline" size="sm" className="gap-1">
                  <Shield className="h-4 w-4" />
                  Manage Permissions
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSaveChanges}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailDialog;
