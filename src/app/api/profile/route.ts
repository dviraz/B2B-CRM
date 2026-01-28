import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit, RateLimitPresets } from '@/lib/rate-limit';
import { z } from 'zod';

const updateProfileSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(255).optional(),
  avatar_url: z.string().url().max(1000).optional().nullable(),
});

export async function GET(request: NextRequest) {
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.read);
  if (rateLimitResult) return rateLimitResult;

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*, company:companies(id, name, status, plan_tier)')
    .eq('id', user.id)
    .single() as { data: Record<string, unknown> | null; error: unknown };

  if (error || !profile) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }

  return NextResponse.json({
    ...profile,
    email: user.email,
  });
}

export async function PATCH(request: NextRequest) {
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.mutation);
  if (rateLimitResult) return rateLimitResult;

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = updateProfileSchema.safeParse(body);
  if (!result.success) {
    const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
    return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (result.data.full_name !== undefined) {
    updates.full_name = result.data.full_name;
  }
  if (result.data.avatar_url !== undefined) {
    updates.avatar_url = result.data.avatar_url;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data: profile, error } = await (supabase
    .from('profiles') as any)
    .update(updates)
    .eq('id', user.id)
    .select('*, company:companies(id, name, status, plan_tier)')
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }

  return NextResponse.json({
    ...profile,
    email: user.email,
  });
}
