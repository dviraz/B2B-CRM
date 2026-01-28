import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit, RateLimitPresets } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting (read preset: 120/min)
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.read);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch workflow
  const { data: workflow, error } = await (supabase
    .from('workflow_rules') as ReturnType<typeof supabase.from>)
    .select('*')
    .eq('id', id)
    .single() as { data: Record<string, unknown> | null; error: unknown };

  if (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  return NextResponse.json(workflow);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting (mutation preset: 60/min)
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.mutation);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  // Only include fields that are provided
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.trigger_type !== undefined) updateData.trigger_type = body.trigger_type;
  if (body.trigger_conditions !== undefined) updateData.trigger_conditions = body.trigger_conditions;
  if (body.action_type !== undefined) updateData.action_type = body.action_type;
  if (body.action_config !== undefined) updateData.action_config = body.action_config;
  if (body.is_active !== undefined) updateData.is_active = body.is_active;

  updateData.updated_at = new Date().toISOString();

  // Update workflow
  const { data: workflow, error } = await (supabase
    .from('workflow_rules') as ReturnType<typeof supabase.from>)
    .update(updateData)
    .eq('id', id)
    .select()
    .single() as { data: Record<string, unknown> | null; error: unknown };

  if (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  return NextResponse.json(workflow);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting (mutation preset: 60/min)
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.mutation);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Delete workflow
  const { error } = await (supabase
    .from('workflow_rules') as ReturnType<typeof supabase.from>)
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
