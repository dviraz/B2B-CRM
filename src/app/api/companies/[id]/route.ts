import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single() as { data: Record<string, unknown> | null; error: { code?: string } | null };

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch company' },
      { status: 500 }
    );
  }

  // Get active request count
  const { count } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', id)
    .eq('status', 'active') as { count: number | null };

  return NextResponse.json({
    ...company,
    active_request_count: count || 0,
  });
}
