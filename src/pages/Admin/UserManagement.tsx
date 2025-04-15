
import React from 'react';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';
import UserList from '@/components/Admin/UserManagement/UserList';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const UserManagement = () => {
  return (
    <AdminPortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            View, edit, and manage user accounts and permissions
          </p>
        </div>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Manage reader and contributor accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserList />
          </CardContent>
        </Card>
      </div>
    </AdminPortalLayout>
  );
};

export default UserManagement;
