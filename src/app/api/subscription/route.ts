import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit, RateLimitPresets } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.read);
  if (rateLimitResult) return rateLimitResult;

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user profile with company
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single() as { data: { company_id: string | null; role: string } | null };

  if (!profile?.company_id) {
    return NextResponse.json({ error: 'No company associated' }, { status: 404 });
  }

  // Get company details
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name, status, plan_tier, max_active_limit, woo_customer_id, created_at')
    .eq('id', profile.company_id)
    .single() as { data: Record<string, unknown> | null; error: unknown };

  if (companyError || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  // Get active services for this company
  const { data: services } = await supabase
    .from('client_services')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false }) as { data: Array<Record<string, unknown>> | null };

  // Get request usage stats
  const { count: totalRequests } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', profile.company_id);

  const { count: activeRequests } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', profile.company_id)
    .eq('status', 'active');

  const { count: completedRequests } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', profile.company_id)
    .eq('status', 'done');

  const { count: queuedRequests } = await supabase
    .from('requests')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', profile.company_id)
    .eq('status', 'queue');

  return NextResponse.json({
    company: {
      id: company.id,
      name: company.name,
      status: company.status,
      plan_tier: company.plan_tier,
      max_active_limit: company.max_active_limit,
      woo_customer_id: company.woo_customer_id,
      created_at: company.created_at,
    },
    services: services || [],
    usage: {
      total_requests: totalRequests || 0,
      active_requests: activeRequests || 0,
      completed_requests: completedRequests || 0,
      queued_requests: queuedRequests || 0,
      max_active_limit: company.max_active_limit,
    },
  });
}
