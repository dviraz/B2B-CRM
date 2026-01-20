import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyWebhookSignature, getPlanFromProducts } from '@/lib/woocommerce/client';
import type { WooWebhookPayload, CompanyStatus } from '@/types';

// Map WooCommerce status to our company status
function mapWooStatus(wooStatus: string): CompanyStatus {
  switch (wooStatus) {
    case 'active':
      return 'active';
    case 'on-hold':
    case 'pending':
      return 'paused';
    case 'cancelled':
    case 'expired':
      return 'churned';
    default:
      return 'paused';
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();

    // Handle empty body (WooCommerce ping)
    if (!rawBody || rawBody.trim() === '') {
      return NextResponse.json({ status: 'ok', message: 'Webhook endpoint active' });
    }

    // Parse the payload
    let payload: WooWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ status: 'ok', message: 'Ping received' });
    }

    // Handle WooCommerce ping/test requests
    if (!payload.customer_id && !payload.status) {
      return NextResponse.json({ status: 'ok', message: 'Webhook verified' });
    }

    // Verify webhook signature for actual webhook events
    const signature = request.headers.get('x-wc-webhook-signature');
    const webhookSecret = process.env.WOO_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
    }

    // Validate required fields for actual events
    if (!payload.customer_id || !payload.status) {
      return NextResponse.json(
        { error: 'Invalid payload: missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const wooCustomerId = String(payload.customer_id);
    const companyStatus = mapWooStatus(payload.status);
    const plan = getPlanFromProducts(payload.line_items || []);

    // Check if company exists
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('woo_customer_id', wooCustomerId)
      .single() as { data: { id: string } | null };

    if (existingCompany) {
      // Update existing company
      const { error: updateError } = await (supabase
        .from('companies') as any)
        .update({
          status: companyStatus,
          plan_tier: plan.tier,
          max_active_limit: plan.maxActive,
        })
        .eq('id', existingCompany.id);

      if (updateError) {
        console.error('Error updating company:', updateError);
        return NextResponse.json(
          { error: 'Failed to update company' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'updated',
        companyId: existingCompany.id,
      });
    }

    // Create new company and user
    const companyName = payload.billing?.company ||
      `${payload.billing?.first_name || ''} ${payload.billing?.last_name || ''}`.trim() ||
      `Customer ${wooCustomerId}`;

    const email = payload.billing?.email;
    if (!email) {
      return NextResponse.json(
        { error: 'No email provided in billing info' },
        { status: 400 }
      );
    }

    // Create the company
    const { data: newCompany, error: companyError } = await (supabase
      .from('companies') as any)
      .insert({
        name: companyName,
        status: companyStatus,
        plan_tier: plan.tier,
        max_active_limit: plan.maxActive,
        woo_customer_id: wooCustomerId,
      })
      .select()
      .single() as { data: { id: string } | null; error: unknown };

    if (companyError || !newCompany) {
      console.error('Error creating company:', companyError);
      return NextResponse.json(
        { error: 'Failed to create company' },
        { status: 500 }
      );
    }

    // Create auth user with password reset flow
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: `${payload.billing?.first_name || ''} ${payload.billing?.last_name || ''}`.trim(),
        company_id: newCompany.id,
      },
    });

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError);
      // Rollback company creation
      await (supabase.from('companies') as any).delete().eq('id', newCompany.id);
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    // Update profile with company association
    const { error: profileError } = await (supabase
      .from('profiles') as any)
      .update({
        company_id: newCompany.id,
        full_name: `${payload.billing?.first_name || ''} ${payload.billing?.last_name || ''}`.trim(),
      })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    // Send password reset email for initial setup
    const { error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/set-password`,
      },
    });

    if (resetError) {
      console.error('Error sending password reset:', resetError);
    }

    return NextResponse.json({
      success: true,
      action: 'created',
      companyId: newCompany.id,
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle WooCommerce webhook verification ping
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
