import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit, RateLimitPresets } from '@/lib/rate-limit';
import type { ServiceType, ServiceStatus, BillingCycle } from '@/types/database';

type Params = Promise<{ id: string; serviceId: string }>;

// Valid enum values for validation
const SERVICE_TYPES: ServiceType[] = ['subscription', 'one_time'];
const SERVICE_STATUSES: ServiceStatus[] = ['active', 'paused', 'cancelled', 'completed', 'pending'];
const BILLING_CYCLES: BillingCycle[] = ['monthly', 'quarterly', 'yearly', 'one_time'];

// GET /api/companies/[id]/services/[serviceId] - Get a single service
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  // Apply rate limiting (read preset: 120/min)
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.read);
  if (rateLimitResult) return rateLimitResult;

  const { id: companyId, serviceId } = await params;
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

  if (profile.role !== 'admin' && profile.company_id !== companyId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: service, error } = await (supabase
    .from('client_services') as ReturnType<typeof supabase.from>)
    .select('*')
    .eq('id', serviceId)
    .eq('company_id', companyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch service' },
      { status: 500 }
    );
  }

  return NextResponse.json(service);
}

// PUT /api/companies/[id]/services/[serviceId] - Update a service
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  // Apply rate limiting (mutation preset: 60/min)
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.mutation);
  if (rateLimitResult) return rateLimitResult;

  const { id: companyId, serviceId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can update services
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

  // Verify service exists and belongs to company
  const { data: existingService, error: fetchError } = await (supabase
    .from('client_services') as ReturnType<typeof supabase.from>)
    .select('id')
    .eq('id', serviceId)
    .eq('company_id', companyId)
    .single();

  if (fetchError || !existingService) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
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

  const updateData: Record<string, unknown> = {};

  if (service_name !== undefined) {
    if (typeof service_name !== 'string' || service_name.trim() === '') {
      return NextResponse.json(
        { error: 'Service name cannot be empty' },
        { status: 400 }
      );
    }
    updateData.service_name = service_name.trim();
  }

  if (service_type !== undefined) {
    if (!SERVICE_TYPES.includes(service_type)) {
      return NextResponse.json(
        { error: 'Invalid service type' },
        { status: 400 }
      );
    }
    updateData.service_type = service_type;
  }

  if (status !== undefined) {
    if (!SERVICE_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid service status' },
        { status: 400 }
      );
    }
    updateData.status = status;
  }

  if (billing_cycle !== undefined) {
    if (billing_cycle !== null && !BILLING_CYCLES.includes(billing_cycle)) {
      return NextResponse.json(
        { error: 'Invalid billing cycle' },
        { status: 400 }
      );
    }
    updateData.billing_cycle = billing_cycle;
  }

  if (price !== undefined) updateData.price = price;
  if (start_date !== undefined) updateData.start_date = start_date;
  if (end_date !== undefined) updateData.end_date = end_date;
  if (renewal_date !== undefined) updateData.renewal_date = renewal_date;
  if (woo_product_id !== undefined) updateData.woo_product_id = woo_product_id?.trim() || null;
  if (woo_subscription_id !== undefined) updateData.woo_subscription_id = woo_subscription_id?.trim() || null;
  if (woo_order_id !== undefined) updateData.woo_order_id = woo_order_id?.trim() || null;
  if (notes !== undefined) updateData.notes = notes?.trim() || null;
  if (metadata !== undefined) updateData.metadata = metadata;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'No fields to update' },
      { status: 400 }
    );
  }

  const { data: updatedService, error } = await (supabase
    .from('client_services') as ReturnType<typeof supabase.from>)
    .update(updateData)
    .eq('id', serviceId)
    .select()
    .single();

  if (error) {
    console.error('Error updating service:', error);
    return NextResponse.json(
      { error: 'Failed to update service' },
      { status: 500 }
    );
  }

  return NextResponse.json(updatedService);
}

// DELETE /api/companies/[id]/services/[serviceId] - Delete a service
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  // Apply rate limiting (mutation preset: 60/min)
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.mutation);
  if (rateLimitResult) return rateLimitResult;

  const { id: companyId, serviceId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can delete services
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

  // Verify service exists and belongs to company
  const { data: existingService, error: fetchError } = await (supabase
    .from('client_services') as ReturnType<typeof supabase.from>)
    .select('id')
    .eq('id', serviceId)
    .eq('company_id', companyId)
    .single();

  if (fetchError || !existingService) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  const { error } = await (supabase
    .from('client_services') as ReturnType<typeof supabase.from>)
    .delete()
    .eq('id', serviceId);

  if (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json(
      { error: 'Failed to delete service' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
