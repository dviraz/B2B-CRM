import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { NotificationPreferencesForm } from '@/components/notification-preferences';

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account preferences
        </p>
      </div>

      <div className="space-y-6">
        <NotificationPreferencesForm />
      </div>
    </div>
  );
}
