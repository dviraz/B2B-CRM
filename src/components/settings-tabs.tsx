'use client';

import { User, Shield, Bell, Users, CreditCard } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileSettings } from '@/components/profile-settings';
import { SecuritySettings } from '@/components/security-settings';
import { NotificationPreferencesForm } from '@/components/notification-preferences';
import { SubscriptionSettings } from '@/components/subscription-settings';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SettingsTabsProps {
  isAdmin?: boolean;
}

export function SettingsTabs({ isAdmin = false }: SettingsTabsProps) {
  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="profile" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Profile</span>
        </TabsTrigger>
        <TabsTrigger value="security" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">Security</span>
        </TabsTrigger>
        <TabsTrigger value="notifications" className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">Notifications</span>
        </TabsTrigger>
        {!isAdmin && (
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Subscription</span>
          </TabsTrigger>
        )}
        {isAdmin && (
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Team</span>
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="profile">
        <ProfileSettings />
      </TabsContent>

      <TabsContent value="security">
        <SecuritySettings />
      </TabsContent>

      <TabsContent value="notifications">
        <NotificationPreferencesForm />
      </TabsContent>

      {!isAdmin && (
        <TabsContent value="subscription">
          <SubscriptionSettings />
        </TabsContent>
      )}

      {isAdmin && (
        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Management
              </CardTitle>
              <CardDescription>
                Manage your team members and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Manage team members, invite new admins, and configure permissions.
              </p>
              <Button asChild>
                <Link href="/dashboard/admin/team">
                  Go to Team Management
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      )}
    </Tabs>
  );
}
