import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit, RateLimitPresets } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Apply rate limiting (mutation preset: 60/min)
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.mutation);
  if (rateLimitResult) return rateLimitResult;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { notification_ids, mark_all } = body;

  if (!mark_all && (!notification_ids || !Array.isArray(notification_ids))) {
    return NextResponse.json(
      { error: 'notification_ids array or mark_all flag is required' },
      { status: 400 }
    );
  }

  let query = (supabase.from('notifications') as any)
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id);

  if (!mark_all) {
    query = query.in('id', notification_ids);
  }

  const { error } = await query as { error: unknown };

  if (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
