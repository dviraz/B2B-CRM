'use client';

import { useState, useEffect } from 'react';
import { Bell, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { NotificationPreferences } from '@/types';

export function NotificationPreferencesForm() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch('/api/notifications/preferences');
        if (response.ok) {
          const data = await response.json();
          setPreferences(data);
        }
      } catch {
        toast.error('Failed to load notification preferences');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean | string) => {
    if (!preferences) return;

    const updatedPreferences = { ...preferences, [key]: value };
    setPreferences(updatedPreferences);

    setIsSaving(true);
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      toast.success('Preferences updated');
    } catch {
      // Revert on error
      setPreferences(preferences);
      toast.error('Failed to update preferences');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load preferences.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose how you want to be notified about activity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Notifications */}
        <div>
          <h4 className="text-sm font-medium flex items-center gap-2 mb-4">
            <Mail className="h-4 w-4" />
            Email Notifications
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email_on_comment" className="flex flex-col gap-1">
                <span>Comments</span>
                <span className="font-normal text-muted-foreground text-xs">
                  Get notified when someone comments on your requests
                </span>
              </Label>
              <Switch
                id="email_on_comment"
                checked={preferences.email_on_comment}
                onCheckedChange={(checked) => updatePreference('email_on_comment', checked)}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="email_on_status_change" className="flex flex-col gap-1">
                <span>Status Changes</span>
                <span className="font-normal text-muted-foreground text-xs">
                  Get notified when request status changes
                </span>
              </Label>
              <Switch
                id="email_on_status_change"
                checked={preferences.email_on_status_change}
                onCheckedChange={(checked) => updatePreference('email_on_status_change', checked)}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="email_on_assignment" className="flex flex-col gap-1">
                <span>Assignments</span>
                <span className="font-normal text-muted-foreground text-xs">
                  Get notified when you&apos;re assigned to a request
                </span>
              </Label>
              <Switch
                id="email_on_assignment"
                checked={preferences.email_on_assignment}
                onCheckedChange={(checked) => updatePreference('email_on_assignment', checked)}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="email_on_mention" className="flex flex-col gap-1">
                <span>Mentions</span>
                <span className="font-normal text-muted-foreground text-xs">
                  Get notified when someone mentions you
                </span>
              </Label>
              <Switch
                id="email_on_mention"
                checked={preferences.email_on_mention}
                onCheckedChange={(checked) => updatePreference('email_on_mention', checked)}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="email_on_due_date" className="flex flex-col gap-1">
                <span>Due Date Reminders</span>
                <span className="font-normal text-muted-foreground text-xs">
                  Get notified when a due date is approaching
                </span>
              </Label>
              <Switch
                id="email_on_due_date"
                checked={preferences.email_on_due_date}
                onCheckedChange={(checked) => updatePreference('email_on_due_date', checked)}
                disabled={isSaving}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Digest Settings */}
        <div>
          <h4 className="text-sm font-medium mb-4">Email Digest</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email_digest_enabled" className="flex flex-col gap-1">
                <span>Enable Digest</span>
                <span className="font-normal text-muted-foreground text-xs">
                  Receive a summary email instead of individual notifications
                </span>
              </Label>
              <Switch
                id="email_digest_enabled"
                checked={preferences.email_digest_enabled}
                onCheckedChange={(checked) => updatePreference('email_digest_enabled', checked)}
                disabled={isSaving}
              />
            </div>

            {preferences.email_digest_enabled && (
              <div className="flex items-center gap-4 pl-4">
                <Label className="text-sm text-muted-foreground">Frequency:</Label>
                <div className="flex gap-2">
                  <Button
                    variant={preferences.email_digest_frequency === 'daily' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updatePreference('email_digest_frequency', 'daily')}
                    disabled={isSaving}
                  >
                    Daily
                  </Button>
                  <Button
                    variant={preferences.email_digest_frequency === 'weekly' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updatePreference('email_digest_frequency', 'weekly')}
                    disabled={isSaving}
                  >
                    Weekly
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
