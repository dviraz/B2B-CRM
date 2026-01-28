import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit, RateLimitPresets } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  // Apply rate limiting (read preset: 120/min)
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.read);
  if (rateLimitResult) return rateLimitResult;
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

  // Fetch all workflows
  const { data: workflows, error } = await (supabase
    .from('workflow_rules') as ReturnType<typeof supabase.from>)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(workflows);
}

export async function POST(request: NextRequest) {
  // Apply rate limiting (mutation preset: 60/min)
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.mutation);
  if (rateLimitResult) return rateLimitResult;

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
  const {
    name,
    description,
    trigger_type,
    trigger_conditions,
    action_type,
    action_config,
    is_active,
  } = body;

  if (!name || !trigger_type || !action_type) {
    return NextResponse.json(
      { error: 'Name, trigger_type, and action_type are required' },
      { status: 400 }
    );
  }

  // Create workflow
  const { data: workflow, error } = await (supabase
    .from('workflow_rules') as ReturnType<typeof supabase.from>)
    .insert({
      name,
      description,
      trigger_type,
      trigger_conditions,
      action_type,
      action_config,
      is_active: is_active ?? true,
      created_by: user.id,
    })
    .select()
    .single() as { data: Record<string, unknown> | null; error: unknown };

  if (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  return NextResponse.json(workflow, { status: 201 });
}
