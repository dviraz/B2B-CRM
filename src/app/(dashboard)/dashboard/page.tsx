import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClientDashboard } from '@/components/client-dashboard';
import { AdminDashboard } from '@/components/admin-dashboard';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get user profile with company
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, company:companies(*)')
    .eq('id', user.id)
    .single() as { data: (import('@/types').Profile & { company: import('@/types').Company | null }) | null };

  const isAdmin = profile?.role === 'admin';

  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (!profile?.company) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <h2 className="text-xl font-semibold mb-2">No Company Associated</h2>
        <p className="text-muted-foreground">
          Your account is not associated with a company yet.
          Please contact support if you believe this is an error.
        </p>
      </div>
    );
  }

  // Get requests for client's company
  const { data: requests } = await supabase
    .from('requests')
    .select('*')
    .eq('company_id', profile.company.id)
    .order('created_at', { ascending: false }) as { data: import('@/types').Request[] | null };

  // Get active request count
  const { count: activeCount } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', profile.company.id)
    .eq('status', 'active') as { count: number | null };

  return (
    <ClientDashboard
      company={profile.company}
      requests={requests || []}
      activeCount={activeCount || 0}
    />
  );
}
