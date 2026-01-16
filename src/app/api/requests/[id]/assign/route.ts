import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/requests/[id]/assign - Assign or unassign a request
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: requestId } = await params;

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can assign requests' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { user_id } = body;

  // Verify the request exists
  const { data: existingRequest, error: fetchError } = await supabase
    .from('requests')
    .select('id, title, assigned_to, company_id')
    .eq('id', requestId)
    .single() as { data: { id: string; title: string; assigned_to: string | null; company_id: string } | null; error: unknown };

  if (fetchError || !existingRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  // If assigning to someone, verify the user exists and is an admin
  if (user_id) {
    const { data: assignee, error: assigneeError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user_id)
      .single<{ id: string; role: string }>();

    if (assigneeError || !assignee) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (assignee.role !== 'admin') {
      return NextResponse.json(
        { error: 'Can only assign to team members (admins)' },
        { status: 400 }
      );
    }
  }

  // Update the request assignment
  const { data: updatedRequest, error: updateError } = await (supabase
    .from('requests') as any)
    .update({ assigned_to: user_id || null })
    .eq('id', requestId)
    .select(`
      *,
      assignee:profiles!requests_assigned_to_fkey(id, email, full_name, avatar_url)
    `)
    .single() as { data: Record<string, unknown> | null; error: unknown };

  if (updateError) {
    console.error('Error updating assignment:', updateError);
    return NextResponse.json(
      { error: 'Failed to update assignment' },
      { status: 500 }
    );
  }

  // Create notification for the assignee (if assigning, not unassigning)
  if (user_id && user_id !== existingRequest.assigned_to) {
    await (supabase.from('notifications') as any).insert({
      user_id: user_id,
      type: 'assignment',
      title: 'New Assignment',
      message: `You have been assigned to "${existingRequest.title}"`,
      link: `/dashboard/admin/${existingRequest.company_id}`,
      related_request_id: requestId,
      related_company_id: existingRequest.company_id,
    });
  }

  // Log the audit event
  await (supabase.from('audit_logs') as any).insert({
    company_id: existingRequest.company_id,
    user_id: user.id,
    action: 'assign',
    entity_type: 'request',
    entity_id: requestId,
    old_values: { assigned_to: existingRequest.assigned_to },
    new_values: { assigned_to: user_id || null },
    change_summary: user_id
      ? `Request assigned to ${user_id}`
      : 'Request unassigned',
  });

  return NextResponse.json(updatedRequest);
}
