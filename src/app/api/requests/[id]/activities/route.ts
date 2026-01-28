import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit, RateLimitPresets } from '@/lib/rate-limit';

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  // Apply rate limiting (read preset: 120/min)
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.read);
  if (rateLimitResult) return rateLimitResult;

  const { id: requestId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user profile to check access
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single() as { data: { role: string; company_id: string | null } | null };

  // Verify request access for non-admins
  if (profile?.role !== 'admin') {
    const { data: targetRequest } = await supabase
      .from('requests')
      .select('company_id')
      .eq('id', requestId)
      .single() as { data: { company_id: string } | null };

    if (!targetRequest || targetRequest.company_id !== profile?.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      user:profiles(id, email, full_name, avatar_url)
    `)
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })
    .limit(limit) as { data: Array<Record<string, unknown>> | null; error: unknown };

  if (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
