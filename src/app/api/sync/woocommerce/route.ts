import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { WooCommerceClient, getPlanFromProducts } from '@/lib/woocommerce/client';
import { applyRateLimit, RateLimitPresets } from '@/lib/rate-limit';

type ServiceStatus = 'active' | 'paused' | 'cancelled' | 'pending';
type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

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
function mapBillingCycle(billingPeriod?: string, interval?: number): BillingCycle {
  if (billingPeriod === 'year' || (billingPeriod === 'month' && interval === 12)) {
    return 'yearly';
  }
  if (billingPeriod === 'month' && interval === 3) {
    return 'quarterly';
  }
  return 'monthly';
}

// Map WooCommerce subscription status to company status
function mapWooToCompanyStatus(wooStatus: string): 'active' | 'paused' | 'churned' {
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

interface SyncResult {
  success: boolean;
  companiesCreated: number;
  companiesUpdated: number;
  servicesCreated: number;
  servicesUpdated: number;
  errors: string[];
}

// POST /api/sync/woocommerce - Full sync from WooCommerce
export async function POST(request: NextRequest) {
  // Apply strict rate limiting: 5 requests per minute (expensive operation)
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.strict);
  if (rateLimitResult) return rateLimitResult;

  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can run sync
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>();

  if (profile?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  const result: SyncResult = {
    success: true,
    companiesCreated: 0,
    companiesUpdated: 0,
    servicesCreated: 0,
    servicesUpdated: 0,
    errors: [],
  };

  try {
    // Check if WooCommerce is configured
    if (!WooCommerceClient.isConfigured()) {
      return NextResponse.json(
        { error: 'WooCommerce integration is not configured. Set WOO_STORE_URL, WOO_CONSUMER_KEY, and WOO_CONSUMER_SECRET environment variables.' },
        { status: 503 }
      );
    }

    // Use admin client for database operations
    const adminSupabase = createAdminClient();
    const wooClient = new WooCommerceClient();

    // Fetch all subscriptions from WooCommerce
    const subscriptions = await wooClient.getAllSubscriptions();

    for (const subscription of subscriptions) {
      try {
        const wooCustomerId = String(subscription.customer_id);
        const subscriptionId = String(subscription.id);
        const companyStatus = mapWooToCompanyStatus(subscription.status);
        const serviceStatus = mapWooToServiceStatus(subscription.status);

        // Get plan from line items
        const plan = getPlanFromProducts(subscription.line_items.map(item => ({
          product_id: item.product_id,
          name: item.name,
        })));

        // Check if company exists by WooCommerce customer ID
        const { data: existingCompany } = await (adminSupabase
          .from('companies') as ReturnType<typeof adminSupabase.from>)
          .select('id, name')
          .eq('woo_customer_id', wooCustomerId)
          .single();

        let companyId: string;

        if (existingCompany) {
          // Update existing company
          companyId = (existingCompany as { id: string; name: string }).id;

          await (adminSupabase
            .from('companies') as ReturnType<typeof adminSupabase.from>)
            .update({
              status: companyStatus,
              plan_tier: plan.tier,
              max_active_limit: plan.maxActive,
              // Update location from billing if not already set
              city: subscription.billing.city || undefined,
              state: subscription.billing.state || undefined,
              country: subscription.billing.country || undefined,
              phone: subscription.billing.phone || undefined,
            })
            .eq('id', companyId);

          result.companiesUpdated++;
        } else {
          // Create new company
          const companyName = subscription.billing.company ||
            `${subscription.billing.first_name} ${subscription.billing.last_name}`.trim() ||
            `Customer ${wooCustomerId}`;

          const { data: newCompany, error: companyError } = await (adminSupabase
            .from('companies') as ReturnType<typeof adminSupabase.from>)
            .insert({
              name: companyName,
              status: companyStatus,
              plan_tier: plan.tier,
              max_active_limit: plan.maxActive,
              woo_customer_id: wooCustomerId,
              city: subscription.billing.city || null,
              state: subscription.billing.state || null,
              country: subscription.billing.country || null,
              phone: subscription.billing.phone || null,
            })
            .select()
            .single();

          if (companyError || !newCompany) {
            result.errors.push(`Failed to create company for customer ${wooCustomerId}: ${companyError?.message}`);
            continue;
          }

          companyId = (newCompany as { id: string }).id;
          result.companiesCreated++;

          // Create user account if email is available
          const email = subscription.billing.email;
          if (email) {
            const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
              email,
              email_confirm: true,
              user_metadata: {
                full_name: `${subscription.billing.first_name} ${subscription.billing.last_name}`.trim(),
                company_id: companyId,
              },
            });

            if (authData?.user && !authError) {
              // Update profile with company association
              await (adminSupabase
                .from('profiles') as ReturnType<typeof adminSupabase.from>)
                .update({
                  company_id: companyId,
                  full_name: `${subscription.billing.first_name} ${subscription.billing.last_name}`.trim(),
                })
                .eq('id', authData.user.id);

              // Send password reset email
              await adminSupabase.auth.admin.generateLink({
                type: 'recovery',
                email,
                options: {
                  redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/set-password`,
                },
              });
            }
          }
        }

        // Sync services for each line item
        // FIX: Fetch ALL existing services for this company in ONE query to avoid N+1
        const { data: existingServices } = await (adminSupabase
          .from('client_services') as ReturnType<typeof adminSupabase.from>)
          .select('id, woo_product_id, woo_subscription_id')
          .eq('company_id', companyId)
          .eq('woo_subscription_id', subscriptionId);

        // Create lookup map for O(1) access
        const serviceMap = new Map<string, { id: string }>();
        if (existingServices) {
          for (const service of existingServices as Array<{ id: string; woo_product_id: string | null; woo_subscription_id: string | null }>) {
            const key = `${service.woo_subscription_id}:${service.woo_product_id}`;
            serviceMap.set(key, { id: service.id });
          }
        }

        // Prepare batch operations
        const servicesToUpdate: Array<{ id: string; updates: Record<string, unknown> }> = [];
        const servicesToInsert: Array<Record<string, unknown>> = [];

        for (const item of subscription.line_items) {
          const productId = String(item.product_id);
          const billingCycle = mapBillingCycle(subscription.billing_period, subscription.billing_interval);
          const price = parseFloat(item.total) || parseFloat(subscription.total) || null;

          // Parse dates
          const startDate = subscription.start_date
            ? new Date(subscription.start_date).toISOString().split('T')[0]
            : null;
          const renewalDate = subscription.next_payment_date
            ? new Date(subscription.next_payment_date).toISOString().split('T')[0]
            : null;
          const endDate = subscription.end_date
            ? new Date(subscription.end_date).toISOString().split('T')[0]
            : null;

          const serviceKey = `${subscriptionId}:${productId}`;
          const existingService = serviceMap.get(serviceKey);

          if (existingService) {
            // Queue update
            servicesToUpdate.push({
              id: existingService.id,
              updates: {
                status: serviceStatus,
                price,
                renewal_date: renewalDate,
                end_date: endDate,
              },
            });
          } else {
            // Queue insert
            servicesToInsert.push({
              company_id: companyId,
              service_name: item.name,
              service_type: 'subscription',
              status: serviceStatus,
              price,
              billing_cycle: billingCycle,
              start_date: startDate,
              renewal_date: renewalDate,
              end_date: endDate,
              woo_product_id: productId,
              woo_subscription_id: subscriptionId,
            });
          }
        }

        // Batch execute updates
        for (const { id, updates } of servicesToUpdate) {
          await (adminSupabase
            .from('client_services') as ReturnType<typeof adminSupabase.from>)
            .update(updates)
            .eq('id', id);
        }
        result.servicesUpdated += servicesToUpdate.length;

        // Batch execute inserts
        if (servicesToInsert.length > 0) {
          await (adminSupabase
            .from('client_services') as ReturnType<typeof adminSupabase.from>)
            .insert(servicesToInsert);
          result.servicesCreated += servicesToInsert.length;
        }
      } catch (subError) {
        const errorMessage = subError instanceof Error ? subError.message : 'Unknown error';
        result.errors.push(`Error processing subscription ${subscription.id}: ${errorMessage}`);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Sync failed: ${errorMessage}`, details: result },
      { status: 500 }
    );
  }
}

// GET /api/sync/woocommerce - Get sync status/info
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can view sync info
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<{ role: string }>();

  if (profile?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  try {
    // Check if WooCommerce is configured
    if (!WooCommerceClient.isConfigured()) {
      // Return just database counts if WooCommerce is not configured
      const { count: companiesCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      const { count: servicesCount } = await (supabase
        .from('client_services') as ReturnType<typeof supabase.from>)
        .select('*', { count: 'exact', head: true });

      return NextResponse.json({
        woocommerce: {
          configured: false,
          message: 'WooCommerce integration is not configured',
        },
        database: {
          companies: companiesCount || 0,
          services: servicesCount || 0,
        },
      });
    }

    const wooClient = new WooCommerceClient();

    // Get counts from WooCommerce
    const subscriptions = await wooClient.getAllSubscriptions();

    // Get counts from our database
    const { count: companiesCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });

    const { count: servicesCount } = await (supabase
      .from('client_services') as ReturnType<typeof supabase.from>)
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      woocommerce: {
        subscriptions: subscriptions.length,
        active: subscriptions.filter(s => s.status === 'active').length,
        paused: subscriptions.filter(s => ['on-hold', 'pending'].includes(s.status)).length,
        cancelled: subscriptions.filter(s => ['cancelled', 'expired'].includes(s.status)).length,
      },
      database: {
        companies: companiesCount || 0,
        services: servicesCount || 0,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to get sync info: ${errorMessage}` },
      { status: 500 }
    );
  }
}
