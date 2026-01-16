import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single() as { data: Record<string, unknown> | null; error: unknown };

  if (error) {
    // If no preferences exist, return defaults
    if ((error as any)?.code === 'PGRST116') {
      return NextResponse.json({
        user_id: user.id,
        email_on_comment: true,
        email_on_status_change: true,
        email_on_assignment: true,
        email_on_mention: true,
        email_on_due_date: true,
        email_digest_enabled: false,
        email_digest_frequency: 'daily',
        push_enabled: true,
      });
    }
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // Allowed fields to update
  const allowedFields = [
    'email_on_comment',
    'email_on_status_change',
    'email_on_assignment',
    'email_on_mention',
    'email_on_due_date',
    'email_digest_enabled',
    'email_digest_frequency',
    'push_enabled',
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    );
  }

  // Upsert preferences
  const { data, error } = await (supabase
    .from('notification_preferences') as any)
    .upsert({
      user_id: user.id,
      ...updates,
    }, {
      onConflict: 'user_id',
    })
    .select()
    .single() as { data: Record<string, unknown> | null; error: unknown };

  if (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
