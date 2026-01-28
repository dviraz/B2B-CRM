import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit, RateLimitPresets } from '@/lib/rate-limit';
import { withCacheHeaders, CachePresets } from '@/lib/cache';

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

  // Get all active request counts in a single query (instead of N+1 queries)
  const companyIds = (companies || []).map((c) => c.id);

  // Build a count map with a single query
  const activeCountMap = new Map<string, number>();

  if (companyIds.length > 0) {
    const { data: activeRequests } = await supabase
      .from('requests')
      .select('company_id')
      .in('company_id', companyIds)
      .eq('status', 'active') as { data: Array<{ company_id: string }> | null };

    // Count requests per company in memory (single pass)
    (activeRequests || []).forEach((req) => {
      activeCountMap.set(req.company_id, (activeCountMap.get(req.company_id) || 0) + 1);
    });
  }

  const companiesWithCounts = (companies || []).map((company) => ({
    ...company,
    active_request_count: activeCountMap.get(company.id) || 0,
  }));

  // Cache list data for 30 seconds with SWR
  return withCacheHeaders(companiesWithCounts, CachePresets.listData);
}
