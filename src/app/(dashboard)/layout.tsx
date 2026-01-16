import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardNav } from '@/components/dashboard-nav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, company:companies(*)')
    .eq('id', user.id)
    .single() as { data: (import('@/types').Profile & { company: import('@/types').Company | null }) | null };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav
        user={{
          email: user.email || '',
          fullName: profile?.full_name || user.email || '',
          role: profile?.role || 'client',
        }}
        company={profile?.company || null}
      />
      <main className="container mx-auto py-6 px-4">
        {children}
      </main>
    </div>
  );
}
