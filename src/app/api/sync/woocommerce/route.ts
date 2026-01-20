import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { WooCommerceClient, getPlanFromProducts } from '@/lib/woocommerce/client';
import type { ServiceStatus, BillingCycle } from '@/types/database';

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
    .single();

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
        const { data: existingCompany } = await adminSupabase
          .from('companies')
          .select('id, name')
          .eq('woo_customer_id', wooCustomerId)
          .single();

        let companyId: string;

        if (existingCompany) {
          // Update existing company
          companyId = existingCompany.id;

          await adminSupabase
            .from('companies')
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

          const { data: newCompany, error: companyError } = await adminSupabase
            .from('companies')
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

          companyId = newCompany.id;
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
              await adminSupabase
                .from('profiles')
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

          // Check if service already exists
          const { data: existingService } = await adminSupabase
            .from('client_services')
            .select('id')
            .eq('company_id', companyId)
            .eq('woo_subscription_id', subscriptionId)
            .eq('woo_product_id', productId)
            .single();

          if (existingService) {
            // Update existing service
            await adminSupabase
              .from('client_services')
              .update({
                status: serviceStatus,
                price,
                renewal_date: renewalDate,
                end_date: endDate,
              })
              .eq('id', existingService.id);

            result.servicesUpdated++;
          } else {
            // Create new service
            await adminSupabase
              .from('client_services')
              .insert({
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

            result.servicesCreated++;
          }
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
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  try {
    const wooClient = new WooCommerceClient();

    // Get counts from WooCommerce
    const subscriptions = await wooClient.getAllSubscriptions();

    // Get counts from our database
    const { count: companiesCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });

    const { count: servicesCount } = await supabase
      .from('client_services')
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
