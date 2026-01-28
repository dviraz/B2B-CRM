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

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null };

  const isAdmin = profile?.role === 'admin';

  // Build query
  let query = supabase
    .from('comments')
    .select(`
      *,
      user:profiles(id, email, full_name, avatar_url)
    `)
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  // Non-admins can't see internal comments
  if (!isAdmin) {
    query = query.eq('is_internal', false);
  }

  const { data, error } = await query as { data: Array<Record<string, unknown>> | null; error: unknown };

  if (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
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

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single() as { data: { role: string; company_id: string } | null };

  const isAdmin = profile?.role === 'admin';

  // Verify request exists and user has access
  const { data: targetRequest } = await supabase
    .from('requests')
    .select('company_id, company:companies(status)')
    .eq('id', requestId)
    .single() as { data: { company_id: string; company: Record<string, unknown> | null } | null };

  if (!targetRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  // Non-admins can only comment on their company's requests
  if (!isAdmin && targetRequest.company_id !== profile?.company_id) {
    return NextResponse.json(
      { error: 'Not authorized to comment on this request' },
      { status: 403 }
    );
  }

  // Check company status for non-admins
  const company = targetRequest.company as { status: string } | null;
  if (!isAdmin && company?.status !== 'active') {
    return NextResponse.json(
      { error: 'Cannot comment while subscription is not active' },
      { status: 403 }
    );
  }

  const body = await request.json();

  if (!body.content?.trim()) {
    return NextResponse.json(
      { error: 'Comment content is required' },
      { status: 400 }
    );
  }

  // Non-admins cannot create internal comments
  const isInternal = isAdmin ? (body.is_internal || false) : false;

  const { data, error } = await (supabase
    .from('comments') as any)
    .insert({
      request_id: requestId,
      user_id: user.id,
      content: body.content.trim(),
      is_internal: isInternal,
    })
    .select(`
      *,
      user:profiles(id, email, full_name, avatar_url)
    `)
    .single() as { data: Record<string, unknown> | null; error: unknown };

  if (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
