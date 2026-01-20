import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyWebhookSignature, getPlanFromProducts } from '@/lib/woocommerce/client';
import type { WooWebhookPayload, CompanyStatus, ServiceStatus, ServiceType, BillingCycle } from '@/types';

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

// Map WooCommerce subscription status to service status
function mapWooToServiceStatus(wooStatus: string): ServiceStatus {
  switch (wooStatus) {
    case 'active':
      return 'active';
    case 'on-hold':
    case 'pending':
      return 'paused';
    case 'cancelled':
    case 'expired':
      return 'cancelled';
    default:
      return 'pending';
  }
}

// Map WooCommerce billing period to our billing cycle
function mapBillingCycle(billingPeriod?: string): BillingCycle {
  switch (billingPeriod) {
    case 'day':
    case 'week':
    case 'month':
      return 'monthly';
    case 'year':
      return 'yearly';
    default:
      return 'monthly';
  }
}

// Extended payload type with more WooCommerce fields
interface ExtendedWooPayload extends WooWebhookPayload {
  billing_period?: string;
  billing_interval?: number;
  total?: string;
  order_id?: number;
  next_payment_date?: string;
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

    const extendedPayload = payload as ExtendedWooPayload;

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

      // Update/sync services from subscription
      const serviceStatus = mapWooToServiceStatus(payload.status);
      const subscriptionId = String(payload.id);

      // Update existing services linked to this subscription
      const { error: serviceUpdateError } = await (supabase
        .from('client_services') as any)
        .update({ status: serviceStatus })
        .eq('company_id', existingCompany.id)
        .eq('woo_subscription_id', subscriptionId);

      if (serviceUpdateError) {
        console.error('Error updating services:', serviceUpdateError);
      }

      // Check if we need to create services for new line items
      for (const item of payload.line_items || []) {
        const productId = String(item.product_id);

        // Check if service already exists for this product
        const { data: existingService } = await supabase
          .from('client_services')
          .select('id')
          .eq('company_id', existingCompany.id)
          .eq('woo_product_id', productId)
          .eq('woo_subscription_id', subscriptionId)
          .single();

        if (!existingService) {
          // Create new service for this product
          const billingCycle = mapBillingCycle(extendedPayload.billing_period);
          const price = extendedPayload.total ? parseFloat(extendedPayload.total) : null;
          const renewalDate = extendedPayload.next_payment_date
            ? new Date(extendedPayload.next_payment_date).toISOString().split('T')[0]
            : null;

          await (supabase.from('client_services') as any).insert({
            company_id: existingCompany.id,
            service_name: item.name,
            service_type: 'subscription' as ServiceType,
            status: serviceStatus,
            price,
            billing_cycle: billingCycle,
            start_date: new Date().toISOString().split('T')[0],
            renewal_date: renewalDate,
            woo_product_id: productId,
            woo_subscription_id: subscriptionId,
          });
        }
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

// Handle HEAD requests (used by some webhook verification systems)
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

// Handle OPTIONS requests (CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, POST, HEAD, OPTIONS',
    },
  });
}
