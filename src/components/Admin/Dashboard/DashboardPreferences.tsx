
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Settings } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Preference {
  id: string;
  label: string;
  enabled: boolean;
}

const defaultPreferences: Preference[] = [
  { id: 'totalArticles', label: 'Total Articles', enabled: true },
  { id: 'articleViews', label: 'Article Views', enabled: true },
  { id: 'comments', label: 'Comments', enabled: true },
  { id: 'engagementRate', label: 'Engagement Rate', enabled: true },
  { id: 'activityFeed', label: 'Activity Feed', enabled: true },
  { id: 'recentArticles', label: 'Recent Articles', enabled: true },
  { id: 'invitationRequests', label: 'Invitation Requests', enabled: true },
];

interface DashboardPreferencesProps {
  preferences: Preference[];
  onPreferenceChange: (preferences: Preference[]) => void;
}

const DashboardPreferences: React.FC<DashboardPreferencesProps> = ({
  preferences,
  onPreferenceChange,
}) => {
  const togglePreference = (prefId: string) => {
    const updatedPreferences = preferences.map(pref =>
      pref.id === prefId ? { ...pref, enabled: !pref.enabled } : pref
    );
    onPreferenceChange(updatedPreferences);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto">
          <Settings className="h-4 w-4 mr-2" />
          Customize Dashboard
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Dashboard Preferences</SheetTitle>
          <SheetDescription>
            Choose which sections to display on your dashboard.
          </SheetDescription>
        </SheetHeader>
        <div className="py-6 space-y-4">
          {preferences.map((pref) => (
            <div key={pref.id} className="flex items-center justify-between">
              <Label htmlFor={pref.id}>{pref.label}</Label>
              <Switch
                id={pref.id}
                checked={pref.enabled}
                onCheckedChange={() => togglePreference(pref.id)}
              />
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export { defaultPreferences, type Preference };
export default DashboardPreferences;
