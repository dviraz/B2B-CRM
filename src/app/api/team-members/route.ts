import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { applyRateLimit, RateLimitPresets } from '@/lib/rate-limit';
import { sendPasswordResetEmail } from '@/lib/email';
import { z } from 'zod';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().max(255).optional().nullable(),
});

export async function GET(request: NextRequest) {
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.read);
  if (rateLimitResult) return rateLimitResult;

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null };

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get admin team members (users with role = 'admin')
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url')
    .eq('role', 'admin')
    .order('full_name', { ascending: true }) as { data: Array<Record<string, unknown>> | null; error: unknown };

  if (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.mutation);
  if (rateLimitResult) return rateLimitResult;

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null };

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = inviteSchema.safeParse(body);
  if (!result.success) {
    const errors = result.error.issues.map((e) => e.message);
    return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
  }

  const { email, full_name } = result.data;

  // Check if user already exists
  const adminSupabase = createAdminClient();
  const { data: existingUsers } = await adminSupabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email);

  if (existingUser) {
    // User exists, update their role to admin
    const { error: updateError } = await (adminSupabase
      .from('profiles') as any)
      .update({ role: 'admin' })
      .eq('id', existingUser.id);

    if (updateError) {
      console.error('Error updating user role:', updateError);
      return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'User role updated to admin',
      userId: existingUser.id
    });
  }

  // Create new user
  const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: full_name || null,
    },
  });

  if (createError || !newUser.user) {
    console.error('Error creating user:', createError);
    return NextResponse.json({ error: createError?.message || 'Failed to create user' }, { status: 500 });
  }

  // Update profile with admin role
  const { error: profileError } = await (adminSupabase
    .from('profiles') as any)
    .update({
      role: 'admin',
      full_name: full_name || null,
    })
    .eq('id', newUser.user.id);

  if (profileError) {
    console.error('Error updating profile:', profileError);
  }

  // Generate and send password reset email
  const { data: linkData } = await adminSupabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/set-password`,
    },
  });

  if (linkData?.properties?.action_link) {
    await sendPasswordResetEmail(email, linkData.properties.action_link, full_name || undefined);
  }

  return NextResponse.json({
    success: true,
    message: 'Invitation sent successfully',
    userId: newUser.user.id,
  }, { status: 201 });
}
