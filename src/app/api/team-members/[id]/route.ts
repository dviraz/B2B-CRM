import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { applyRateLimit, RateLimitPresets } from '@/lib/rate-limit';

type Params = Promise<{ id: string }>;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.mutation);
  if (rateLimitResult) return rateLimitResult;

  const { id: memberId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null };

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Prevent self-removal
  if (memberId === user.id) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
  }

  // Verify target user exists and is admin
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', memberId)
    .single() as { data: { role: string } | null };

  if (!targetProfile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (targetProfile.role !== 'admin') {
    return NextResponse.json({ error: 'User is not an admin' }, { status: 400 });
  }

  // Demote to client role (we don't delete the user, just change their role)
  const adminSupabase = createAdminClient();
  const { error: updateError } = await (adminSupabase
    .from('profiles') as any)
    .update({ role: 'client' })
    .eq('id', memberId);

  if (updateError) {
    console.error('Error removing team member:', updateError);
    return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
