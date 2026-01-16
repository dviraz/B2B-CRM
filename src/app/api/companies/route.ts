import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null };

  if (profile?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const statusFilter = searchParams.get('status');

  let query = supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data: companies, error } = await query as { data: Array<Record<string, unknown> & { id: string }> | null; error: unknown };

  if (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }

  // Get active request counts for each company
  const companiesWithCounts = await Promise.all(
    (companies || []).map(async (company) => {
      const { count } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('status', 'active') as { count: number | null };

      return {
        ...company,
        active_request_count: count || 0,
      };
    })
  );

  return NextResponse.json(companiesWithCounts);
}
