import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('requests')
    .select('*, company:companies(id, name, status, plan_tier)')
    .eq('id', id)
    .single() as { data: Record<string, unknown> | null; error: unknown };

  if (error) {
    if ((error as any).code === 'PGRST116') {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch request' },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function PATCH(
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

  // Only allow updating certain fields
  const allowedFields = ['title', 'description', 'priority', 'assets_link', 'video_brief'];
  const updateData: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    );
  }

  const { data, error } = await (supabase
    .from('requests') as any)
    .update(updateData)
    .eq('id', id)
    .select('*, company:companies(id, name, status, plan_tier)')
    .single() as { data: Record<string, unknown> | null; error: unknown };

  if (error) {
    if ((error as any).code === 'PGRST116') {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    console.error('Error updating request:', error);
    return NextResponse.json(
      { error: 'Failed to update request' },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { id } = await params;
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

  // Check if request exists and get its status
  const { data: existingRequest } = await supabase
    .from('requests')
    .select('status')
    .eq('id', id)
    .single() as { data: { status: string } | null };

  if (!existingRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  // Non-admins can only delete requests in queue status
  if (profile?.role !== 'admin' && existingRequest.status !== 'queue') {
    return NextResponse.json(
      { error: 'Can only delete requests in queue status' },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from('requests')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting request:', error);
    return NextResponse.json(
      { error: 'Failed to delete request' },
      { status: 500 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
