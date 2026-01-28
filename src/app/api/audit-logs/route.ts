import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit, RateLimitPresets } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  // Apply rate limiting (read preset: 120/min)
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.read);
  if (rateLimitResult) return rateLimitResult;
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
      { error: 'Only admins can view audit logs' },
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const entityType = searchParams.get('entity_type');
  const entityId = searchParams.get('entity_id');
  const action = searchParams.get('action');
  const companyId = searchParams.get('company_id');
  const userId = searchParams.get('user_id');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  let query = supabase
    .from('audit_logs')
    .select(`
      *,
      user:profiles(id, email, full_name, avatar_url)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (entityType) {
    query = query.eq('entity_type', entityType);
  }
  if (entityId) {
    query = query.eq('entity_id', entityId);
  }
  if (action) {
    query = query.eq('action', action);
  }
  if (companyId) {
    query = query.eq('company_id', companyId);
  }
  if (userId) {
    query = query.eq('user_id', userId);
  }
  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  const { data, error, count } = await query as {
    data: Array<Record<string, unknown>> | null;
    error: unknown;
    count: number | null;
  };

  if (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data,
    pagination: {
      total: count,
      limit,
      offset,
      has_more: count ? offset + limit < count : false,
    },
  });
}
