import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyWebhookSignature, getPlanFromProducts } from '@/lib/woocommerce/client';
import { applyRateLimit, RateLimitPresets } from '@/lib/rate-limit';
import { sendPasswordResetEmail, sendWelcomeEmail } from '@/lib/email';
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
  // Apply rate limiting: 100 requests per minute per IP
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.webhook);
  if (rateLimitResult) return rateLimitResult;

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

    // REQUIRED: Webhook secret must be configured
    if (!webhookSecret) {
      console.error('CRITICAL: WOO_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook security not configured' },
        { status: 503 }
      );
    }

    // REQUIRED: Signature must be present in webhook requests
    if (!signature) {
      console.error('Webhook request missing signature header');
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 }
      );
    }

    // Verify the signature
    const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.error('Invalid webhook signature detected');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
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

      // FIX: Fetch all existing services in ONE query to avoid N+1
      const { data: existingServices } = await supabase
        .from('client_services')
        .select('id, woo_product_id, woo_subscription_id')
        .eq('company_id', existingCompany.id)
        .eq('woo_subscription_id', subscriptionId);

      // Create lookup map for O(1) access
      const serviceMap = new Map<string, string>();
      if (existingServices) {
        for (const service of existingServices as Array<{ id: string; woo_product_id: string | null }>) {
          if (service.woo_product_id) {
            serviceMap.set(service.woo_product_id, service.id);
          }
        }
      }

      // Update all existing services status
      if (existingServices && existingServices.length > 0) {
        const { error: serviceUpdateError } = await (supabase
          .from('client_services') as any)
          .update({ status: serviceStatus })
          .eq('company_id', existingCompany.id)
          .eq('woo_subscription_id', subscriptionId);

        if (serviceUpdateError) {
          console.error('Error updating services:', serviceUpdateError);
        }
      }

      // Batch insert new services
      const servicesToInsert: Array<Record<string, unknown>> = [];

      for (const item of payload.line_items || []) {
        const productId = String(item.product_id);

        // Check if service exists using in-memory map
        if (!serviceMap.has(productId)) {
          // Prepare new service for batch insert
          const billingCycle = mapBillingCycle(extendedPayload.billing_period);
          const price = extendedPayload.total ? parseFloat(extendedPayload.total) : null;
          const renewalDate = extendedPayload.next_payment_date
            ? new Date(extendedPayload.next_payment_date).toISOString().split('T')[0]
            : null;

          servicesToInsert.push({
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

      // Batch insert all new services at once
      if (servicesToInsert.length > 0) {
        await (supabase.from('client_services') as any).insert(servicesToInsert);
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

    // Generate password reset link for initial setup
    const { data: linkData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/set-password`,
      },
    });

    if (resetError) {
      console.error('Error generating password reset link:', resetError);
    }

    // Send password reset email via Brevo
    const userName = `${payload.billing?.first_name || ''} ${payload.billing?.last_name || ''}`.trim();
    if (linkData?.properties?.action_link) {
      const emailResult = await sendPasswordResetEmail(
        email,
        linkData.properties.action_link,
        userName || undefined
      );
      if (!emailResult.success) {
        console.error('Error sending password reset email:', emailResult.error);
      }
    }

    // Send welcome email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const welcomeResult = await sendWelcomeEmail(
      email,
      companyName,
      `${appUrl}/login`,
      userName || undefined
    );
    if (!welcomeResult.success) {
      console.error('Error sending welcome email:', welcomeResult.error);
    }

    return NextResponse.json({
      success: true,
      action: 'created',
      companyId: newCompany.id,
      emailSent: !!linkData?.properties?.action_link,
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
