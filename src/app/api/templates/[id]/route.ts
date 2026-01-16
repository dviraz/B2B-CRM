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
    .from('request_templates')
    .select('*')
    .eq('id', id)
    .single() as { data: Record<string, unknown> | null; error: unknown };

  if (error) {
    if ((error as any)?.code === 'PGRST116') {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
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

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null };

  if (profile?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can update templates' },
      { status: 403 }
    );
  }

  const body = await request.json();

  // Allowed fields to update
  const allowedFields = [
    'name',
    'description',
    'title_template',
    'description_template',
    'default_priority',
    'default_sla_hours',
    'category',
    'is_active',
    'is_global',
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

  const { data, error } = await (supabase
    .from('request_templates') as any)
    .update(updates)
    .eq('id', id)
    .select()
    .single() as { data: Record<string, unknown> | null; error: unknown };

  if (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
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

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null };

  if (profile?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can delete templates' },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from('request_templates')
    .delete()
    .eq('id', id) as { error: unknown };

  if (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
