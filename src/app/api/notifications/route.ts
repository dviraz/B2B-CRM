import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const unreadOnly = searchParams.get('unread') === 'true';
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  let query = supabase
    .from('notifications')
    .select(`
      *,
      request:requests(id, title)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data, error } = await query as { data: Array<Record<string, unknown>> | null; error: unknown };

  if (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin (only admins can create notifications for others)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null };

  if (profile?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can create notifications' },
      { status: 403 }
    );
  }

  const body = await request.json();

  if (!body.user_id || !body.type || !body.title) {
    return NextResponse.json(
      { error: 'user_id, type, and title are required' },
      { status: 400 }
    );
  }

  const { data, error } = await (supabase
    .from('notifications') as any)
    .insert({
      user_id: body.user_id,
      type: body.type,
      title: body.title,
      message: body.message || null,
      link: body.link || null,
      related_request_id: body.related_request_id || null,
      related_company_id: body.related_company_id || null,
    })
    .select()
    .single() as { data: Record<string, unknown> | null; error: unknown };

  if (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
