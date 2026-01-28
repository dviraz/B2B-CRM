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

  const { data, error } = await supabase
    .from('request_assignments')
    .select(`
      *,
      assignee:profiles!request_assignments_assigned_to_fkey(id, email, full_name, avatar_url),
      assigner:profiles!request_assignments_assigned_by_fkey(id, email, full_name, avatar_url)
    `)
    .eq('request_id', requestId)
    .order('assigned_at', { ascending: false }) as { data: Array<Record<string, unknown>> | null; error: unknown };

  if (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  // Apply rate limiting (mutation preset: 60/min)
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.mutation);
  if (rateLimitResult) return rateLimitResult;

  const { id: requestId } = await params;
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
      { error: 'Only admins can assign requests' },
      { status: 403 }
    );
  }

  const body = await request.json();

  if (!body.assigned_to) {
    return NextResponse.json(
      { error: 'assigned_to is required' },
      { status: 400 }
    );
  }

  // Verify the request exists
  const { data: targetRequest } = await supabase
    .from('requests')
    .select('id')
    .eq('id', requestId)
    .single() as { data: { id: string } | null };

  if (!targetRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  // Verify the assignee exists and is an admin
  const { data: assignee } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', body.assigned_to)
    .single() as { data: { id: string; role: string } | null };

  if (!assignee) {
    return NextResponse.json({ error: 'Assignee not found' }, { status: 404 });
  }

  if (assignee.role !== 'admin') {
    return NextResponse.json(
      { error: 'Can only assign to team members' },
      { status: 400 }
    );
  }

  // Check for existing assignment
  const { data: existingAssignment } = await supabase
    .from('request_assignments')
    .select('id')
    .eq('request_id', requestId)
    .eq('assigned_to', body.assigned_to)
    .single() as { data: { id: string } | null };

  if (existingAssignment) {
    return NextResponse.json(
      { error: 'User is already assigned to this request' },
      { status: 400 }
    );
  }

  const { data, error } = await (supabase
    .from('request_assignments') as any)
    .insert({
      request_id: requestId,
      assigned_to: body.assigned_to,
      assigned_by: user.id,
      status: 'assigned',
      notes: body.notes || null,
    })
    .select(`
      *,
      assignee:profiles!request_assignments_assigned_to_fkey(id, email, full_name, avatar_url),
      assigner:profiles!request_assignments_assigned_by_fkey(id, email, full_name, avatar_url)
    `)
    .single() as { data: Record<string, unknown> | null; error: unknown };

  if (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    );
  }

  // Also update the request's assigned_to field with the primary assignee
  await (supabase.from('requests') as any)
    .update({ assigned_to: body.assigned_to })
    .eq('id', requestId);

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  // Apply rate limiting (mutation preset: 60/min)
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.mutation);
  if (rateLimitResult) return rateLimitResult;

  const { id: requestId } = await params;
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
      { error: 'Only admins can remove assignments' },
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const assignmentId = searchParams.get('assignment_id');

  if (!assignmentId) {
    return NextResponse.json(
      { error: 'assignment_id is required' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('request_assignments')
    .delete()
    .eq('id', assignmentId)
    .eq('request_id', requestId) as { error: unknown };

  if (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json(
      { error: 'Failed to delete assignment' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
