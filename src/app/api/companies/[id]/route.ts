import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit, RateLimitPresets } from '@/lib/rate-limit';
import type { IndustryType, BusinessType, RevenueRange } from '@/types/database';

type Params = Promise<{ id: string }>;

// Valid enum values for validation
const INDUSTRY_TYPES: IndustryType[] = [
  'restaurant', 'dental', 'medical', 'legal', 'real_estate', 'home_services',
  'automotive', 'retail', 'fitness', 'beauty_spa', 'professional_services',
  'construction', 'financial_services', 'technology', 'education', 'nonprofit', 'other'
];
const BUSINESS_TYPES: BusinessType[] = ['b2b', 'b2c', 'both'];
const REVENUE_RANGES: RevenueRange[] = [
  'under_100k', '100k_500k', '500k_1m', '1m_5m', '5m_10m', 'over_10m'
];

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  // Apply rate limiting (read preset: 120/min)
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.read);
  if (rateLimitResult) return rateLimitResult;

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  // Apply rate limiting (mutation preset: 60/min)
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.mutation);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can update companies
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>();

  if (profile?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  // Verify company exists
  const { data: existingCompany, error: fetchError } = await supabase
    .from('companies')
    .select('id')
    .eq('id', id)
    .single();

  if (fetchError || !existingCompany) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const body = await request.json();
  const {
    name,
    status,
    plan_tier,
    max_active_limit,
    industry,
    business_type,
    city,
    state,
    country,
    website_url,
    google_business_url,
    facebook_url,
    instagram_handle,
    linkedin_url,
    phone,
    employee_count,
    annual_revenue_range,
    logo_url,
    notes,
    onboarding_completed_at,
  } = body;

  const updateData: Record<string, unknown> = {};

  // Basic fields
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Company name cannot be empty' },
        { status: 400 }
      );
    }
    updateData.name = name.trim();
  }

  if (status !== undefined) {
    if (!['active', 'paused', 'churned'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    updateData.status = status;
  }

  if (plan_tier !== undefined) {
    if (!['standard', 'pro'].includes(plan_tier)) {
      return NextResponse.json({ error: 'Invalid plan tier' }, { status: 400 });
    }
    updateData.plan_tier = plan_tier;
  }

  if (max_active_limit !== undefined) {
    if (typeof max_active_limit !== 'number' || max_active_limit < 1) {
      return NextResponse.json({ error: 'Invalid max active limit' }, { status: 400 });
    }
    updateData.max_active_limit = max_active_limit;
  }

  // Business intelligence fields
  if (industry !== undefined) {
    if (industry !== null && !INDUSTRY_TYPES.includes(industry)) {
      return NextResponse.json({ error: 'Invalid industry' }, { status: 400 });
    }
    updateData.industry = industry;
  }

  if (business_type !== undefined) {
    if (business_type !== null && !BUSINESS_TYPES.includes(business_type)) {
      return NextResponse.json({ error: 'Invalid business type' }, { status: 400 });
    }
    updateData.business_type = business_type;
  }

  if (annual_revenue_range !== undefined) {
    if (annual_revenue_range !== null && !REVENUE_RANGES.includes(annual_revenue_range)) {
      return NextResponse.json({ error: 'Invalid revenue range' }, { status: 400 });
    }
    updateData.annual_revenue_range = annual_revenue_range;
  }

  // String fields (allow null)
  if (city !== undefined) updateData.city = city;
  if (state !== undefined) updateData.state = state;
  if (country !== undefined) updateData.country = country;
  if (website_url !== undefined) updateData.website_url = website_url;
  if (google_business_url !== undefined) updateData.google_business_url = google_business_url;
  if (facebook_url !== undefined) updateData.facebook_url = facebook_url;
  if (instagram_handle !== undefined) updateData.instagram_handle = instagram_handle;
  if (linkedin_url !== undefined) updateData.linkedin_url = linkedin_url;
  if (phone !== undefined) updateData.phone = phone;
  if (logo_url !== undefined) updateData.logo_url = logo_url;
  if (notes !== undefined) updateData.notes = notes;

  // Numeric fields
  if (employee_count !== undefined) {
    if (employee_count !== null && (typeof employee_count !== 'number' || employee_count < 0)) {
      return NextResponse.json({ error: 'Invalid employee count' }, { status: 400 });
    }
    updateData.employee_count = employee_count;
  }

  // Timestamp fields
  if (onboarding_completed_at !== undefined) {
    updateData.onboarding_completed_at = onboarding_completed_at;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'No fields to update' },
      { status: 400 }
    );
  }

  const { data: updatedCompany, error } = await (supabase
    .from('companies') as ReturnType<typeof supabase.from>)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    );
  }

  return NextResponse.json(updatedCompany);
}
