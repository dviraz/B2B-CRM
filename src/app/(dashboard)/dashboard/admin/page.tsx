import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminDashboard } from '@/components/admin-dashboard';

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null };

  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return <AdminDashboard />;
}
