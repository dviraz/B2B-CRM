import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit, RateLimitPresets } from '@/lib/rate-limit';
import { z } from 'zod';

const changePasswordSchema = z.object({
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be less than 72 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export async function POST(request: NextRequest) {
  // Use strict rate limiting for password changes
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.strict);
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

  const result = changePasswordSchema.safeParse(body);
  if (!result.success) {
    const errors = result.error.issues.map((e) => e.message);
    return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
  }

  const { error } = await supabase.auth.updateUser({
    password: result.data.newPassword,
  });

  if (error) {
    console.error('Error changing password:', error);
    return NextResponse.json({ error: error.message || 'Failed to change password' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
