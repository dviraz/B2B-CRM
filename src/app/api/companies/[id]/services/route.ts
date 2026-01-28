import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit, RateLimitPresets } from '@/lib/rate-limit';
import type { ClientService, ServiceType, ServiceStatus, BillingCycle } from '@/types/database';

type Params = Promise<{ id: string }>;

// Valid enum values for validation
const SERVICE_TYPES: ServiceType[] = ['subscription', 'one_time'];
const SERVICE_STATUSES: ServiceStatus[] = ['active', 'paused', 'cancelled', 'completed', 'pending'];
const BILLING_CYCLES: BillingCycle[] = ['monthly', 'quarterly', 'yearly', 'one_time'];

// GET /api/companies/[id]/services - List all services for a company
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  // Apply rate limiting (read preset: 120/min)
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.read);
  if (rateLimitResult) return rateLimitResult;

  const { id: companyId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has access to this company
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single<{ role: string; company_id: string | null }>();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Clients can only see services from their own company
  if (profile.role !== 'admin' && profile.company_id !== companyId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const statusFilter = searchParams.get('status');
  const typeFilter = searchParams.get('type');

  let query = (supabase
    .from('client_services') as ReturnType<typeof supabase.from>)
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (statusFilter && SERVICE_STATUSES.includes(statusFilter as ServiceStatus)) {
    query = query.eq('status', statusFilter);
  }

  if (typeFilter && SERVICE_TYPES.includes(typeFilter as ServiceType)) {
    query = query.eq('service_type', typeFilter);
  }

  const { data: services, error } = await query;

  if (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    );
  }

  return NextResponse.json(services);
}

// POST /api/companies/[id]/services - Create a new service
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  // Apply rate limiting (mutation preset: 60/min)
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.mutation);
  if (rateLimitResult) return rateLimitResult;

  const { id: companyId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can create services
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
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .eq('id', companyId)
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const body = await request.json();
  const {
    service_name,
    service_type,
    status,
    price,
    billing_cycle,
    start_date,
    end_date,
    renewal_date,
    woo_product_id,
    woo_subscription_id,
    woo_order_id,
    notes,
    metadata,
  } = body;

  // Validate required fields
  if (!service_name || typeof service_name !== 'string' || service_name.trim() === '') {
    return NextResponse.json(
      { error: 'Service name is required' },
      { status: 400 }
    );
  }

  if (!service_type || !SERVICE_TYPES.includes(service_type)) {
    return NextResponse.json(
      { error: 'Valid service type is required (subscription or one_time)' },
      { status: 400 }
    );
  }

  // Validate optional fields
  if (status && !SERVICE_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: 'Invalid service status' },
      { status: 400 }
    );
  }

  if (billing_cycle && !BILLING_CYCLES.includes(billing_cycle)) {
    return NextResponse.json(
      { error: 'Invalid billing cycle' },
      { status: 400 }
    );
  }

  const serviceData: Partial<ClientService> = {
    company_id: companyId,
    service_name: service_name.trim(),
    service_type,
    status: status || 'active',
    price: price ?? null,
    billing_cycle: billing_cycle || null,
    start_date: start_date || null,
    end_date: end_date || null,
    renewal_date: renewal_date || null,
    woo_product_id: woo_product_id?.trim() || null,
    woo_subscription_id: woo_subscription_id?.trim() || null,
    woo_order_id: woo_order_id?.trim() || null,
    notes: notes?.trim() || null,
    metadata: metadata || {},
  };

  const { data: newService, error } = await (supabase
    .from('client_services') as ReturnType<typeof supabase.from>)
    .insert(serviceData)
    .select()
    .single();

  if (error) {
    console.error('Error creating service:', error);
    return NextResponse.json(
      { error: 'Failed to create service' },
      { status: 500 }
    );
  }

  return NextResponse.json(newService, { status: 201 });
}
