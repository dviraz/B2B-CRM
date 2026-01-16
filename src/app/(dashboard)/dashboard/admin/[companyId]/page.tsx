import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminCompanyBoard } from '@/components/admin-company-board';

type Params = Promise<{ companyId: string }>;

export default async function AdminCompanyPage({
  params,
}: {
  params: Params;
}) {
  const { companyId } = await params;
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

  // Get company
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single() as { data: import('@/types').Company | null };

  if (!company) {
    notFound();
  }

  // Get requests for this company
  const { data: requests } = await supabase
    .from('requests')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false }) as { data: import('@/types').Request[] | null };

  // Get active count
  const { count: activeCount } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'active') as { count: number | null };

  return (
    <AdminCompanyBoard
      company={company}
      requests={requests || []}
      activeCount={activeCount || 0}
    />
  );
}
