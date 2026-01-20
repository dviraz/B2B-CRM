import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { Errors, handleError, logger } from '@/lib/errors';
import { object, string } from '@/lib/validation';

// Validation schema
const acceptSchema = {
  token: string({ minLength: 36, maxLength: 36 }),
  password: string({ minLength: 8, maxLength: 128 }),
};

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - stricter for auth operations
    const rateLimitResult = rateLimit(request, 'auth');
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    const supabase = await createClient();

    // Validate request body
    const body = await request.json();
    const validation = object(acceptSchema)(body);

    if (!validation.success) {
      return handleError(Errors.validation('Invalid request', { errors: validation.errors }));
    }

    const { token, password } = validation.data as { token: string; password: string };

    // Find the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (invitationError || !invitation) {
      return handleError(Errors.notFound('Invitation not found or already used'));
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return handleError(Errors.validation('This invitation has expired'));
    }

    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true, // Auto-confirm since we're using invitations
      user_metadata: {
        full_name: invitation.full_name,
      },
    });

    if (authError) {
      logger.error('Error creating user', authError);
      return handleError(Errors.internal('Failed to create user account'));
    }

    if (!authData.user) {
      return handleError(Errors.internal('Failed to create user account'));
    }

    // Create the profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: invitation.email,
        full_name: invitation.full_name,
        role: invitation.role,
        company_id: invitation.company_id,
      });

    if (profileError) {
      logger.error('Error creating profile', profileError);
      // Try to clean up the auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return handleError(Errors.database('Failed to create user profile'));
    }

    // Mark invitation as accepted
    await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    logger.info('Invitation accepted', {
      invitationId: invitation.id,
      userId: authData.user.id,
      email: invitation.email,
    });

    return NextResponse.json({
      success: true,
      message: 'Account created successfully. You can now log in.',
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimit(request, 'default');
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    const supabase = await createClient();

    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return handleError(Errors.missingField('token'));
    }

    // Find the invitation
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(`
        id,
        email,
        full_name,
        role,
        status,
        expires_at,
        company:companies(id, name)
      `)
      .eq('token', token)
      .single();

    if (error || !invitation) {
      return handleError(Errors.notFound('Invitation'));
    }

    // Check status
    if (invitation.status !== 'pending') {
      return NextResponse.json({
        valid: false,
        reason: invitation.status === 'accepted' ? 'already_accepted' : 'expired',
        invitation: {
          email: invitation.email,
          full_name: invitation.full_name,
        },
      });
    }

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        reason: 'expired',
        invitation: {
          email: invitation.email,
          full_name: invitation.full_name,
        },
      });
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        email: invitation.email,
        full_name: invitation.full_name,
        role: invitation.role,
        company: invitation.company,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
