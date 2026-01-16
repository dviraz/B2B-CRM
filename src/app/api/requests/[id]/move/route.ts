import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { RequestStatus } from '@/types';

type Params = Promise<{ id: string }>;

// Define valid status transitions
const VALID_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  queue: ['active', 'done'], // Admin can move to active, anyone can cancel to done
  active: ['review', 'queue'], // Admin moves to review, can return to queue
  review: ['done', 'active'], // Can be approved or returned
  done: ['queue'], // Can be reopened to queue
};

export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const newStatus = body.status as RequestStatus;

  if (!newStatus || !['queue', 'active', 'review', 'done'].includes(newStatus)) {
    return NextResponse.json(
      { error: 'Invalid status' },
      { status: 400 }
    );
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single() as { data: { role: string; company_id: string } | null };

  const isAdmin = profile?.role === 'admin';

  // Get current request
  const { data: currentRequest } = await supabase
    .from('requests')
    .select('*, company:companies(id, max_active_limit, status)')
    .eq('id', id)
    .single() as { data: { status: string; company_id: string; company: Record<string, unknown> } | null };

  if (!currentRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  const currentStatus = currentRequest.status as RequestStatus;

  // Validate status transition
  if (!VALID_TRANSITIONS[currentStatus]?.includes(newStatus)) {
    return NextResponse.json(
      { error: `Cannot move from ${currentStatus} to ${newStatus}` },
      { status: 400 }
    );
  }

  // Only admins can move requests to "active"
  if (newStatus === 'active' && !isAdmin) {
    return NextResponse.json(
      { error: 'Only admins can activate requests' },
      { status: 403 }
    );
  }

  // Check active request limit when moving to active
  if (newStatus === 'active') {
    const company = currentRequest.company as {
      id: string;
      max_active_limit: number;
      status: string;
    };

    // Count current active requests for this company
    const { count } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', currentRequest.company_id)
      .eq('status', 'active') as { count: number | null };

    if (count !== null && count >= company.max_active_limit) {
      return NextResponse.json(
        {
          error: `Client has reached their active request limit (${company.max_active_limit}). Complete or archive an active request first.`,
          code: 'LIMIT_REACHED',
        },
        { status: 403 }
      );
    }
  }

  // Clients can only move their own company's requests (from review to done)
  if (!isAdmin) {
    if (currentRequest.company_id !== profile?.company_id) {
      return NextResponse.json(
        { error: 'Not authorized to move this request' },
        { status: 403 }
      );
    }

    // Clients can only move from review to done
    if (!(currentStatus === 'review' && newStatus === 'done')) {
      return NextResponse.json(
        { error: 'Clients can only mark reviewed requests as complete' },
        { status: 403 }
      );
    }
  }

  // Update the request status
  const { data, error } = await (supabase
    .from('requests') as any)
    .update({ status: newStatus })
    .eq('id', id)
    .select('*, company:companies(id, name, status, plan_tier)')
    .single() as { data: Record<string, unknown> | null; error: unknown };

  if (error) {
    console.error('Error moving request:', error);
    return NextResponse.json(
      { error: 'Failed to move request' },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
