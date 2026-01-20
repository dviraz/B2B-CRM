import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { Errors, handleError, logger } from '@/lib/errors';
import { object, string, email, uuid, oneOf, optional } from '@/lib/validation';
import type { UserRole } from '@/types';

// Validation schema for invitation
const invitationSchema = {
  email: email(),
  full_name: string({ minLength: 1, maxLength: 255 }),
  role: oneOf(['admin', 'client'] as const),
  company_id: optional(uuid({ required: false })),
};

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimit(request, 'default');
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return handleError(Errors.unauthorized());
    }

    // Only admins can view invitations
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return handleError(Errors.forbidden('Only admins can view invitations'));
    }

    // Get pending invitations
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select(`
        *,
        company:companies(id, name),
        invited_by_user:profiles!invitations_invited_by_fkey(id, email, full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching invitations', error);
      return handleError(Errors.database());
    }

    return NextResponse.json(invitations || []);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimit(request, 'write');
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return handleError(Errors.unauthorized());
    }

    // Only admins can invite users
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return handleError(Errors.forbidden('Only admins can invite users'));
    }

    // Validate request body
    const body = await request.json();
    const validation = object(invitationSchema)(body);

    if (!validation.success) {
      return handleError(Errors.validation('Invalid invitation data', { errors: validation.errors }));
    }

    const { email: inviteeEmail, full_name, role, company_id } = validation.data as {
      email: string;
      full_name: string;
      role: UserRole;
      company_id?: string;
    };

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', inviteeEmail)
      .single();

    if (existingUser) {
      return handleError(Errors.conflict('A user with this email already exists'));
    }

    // Check if invitation already pending
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id')
      .eq('email', inviteeEmail)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return handleError(Errors.conflict('An invitation for this email is already pending'));
    }

    // Validate company if provided and role is client
    if (role === 'client') {
      if (!company_id) {
        return handleError(Errors.validation('Company is required for client role'));
      }

      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('id', company_id)
        .single();

      if (!company) {
        return handleError(Errors.notFound('Company'));
      }
    }

    // Generate invitation token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation
    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        email: inviteeEmail,
        full_name,
        role,
        company_id: role === 'client' ? company_id : null,
        token,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select(`
        *,
        company:companies(id, name),
        invited_by_user:profiles!invitations_invited_by_fkey(id, email, full_name)
      `)
      .single();

    if (error) {
      logger.error('Error creating invitation', error);
      return handleError(Errors.database());
    }

    // Generate invitation URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const invitationUrl = `${appUrl}/auth/accept-invitation?token=${token}`;

    logger.info('Invitation created', {
      invitationId: invitation.id,
      email: inviteeEmail,
      role
    });

    // TODO: Send invitation email here
    // For now, return the URL in the response

    return NextResponse.json(
      {
        ...invitation,
        invitation_url: invitationUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimit(request, 'write');
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return handleError(Errors.unauthorized());
    }

    // Only admins can delete invitations
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return handleError(Errors.forbidden('Only admins can delete invitations'));
    }

    const searchParams = request.nextUrl.searchParams;
    const invitationId = searchParams.get('id');

    if (!invitationId) {
      return handleError(Errors.missingField('id'));
    }

    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId);

    if (error) {
      logger.error('Error deleting invitation', error);
      return handleError(Errors.database());
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}
