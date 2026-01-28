import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TeamManagement } from '@/components/team-management';

export default async function TeamPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null };

  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage your team members and invite new admins
        </p>
      </div>

      <TeamManagement currentUserId={user.id} />
    </div>
  );
}
