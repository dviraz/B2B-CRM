import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit, RateLimitPresets } from '@/lib/rate-limit';
import { WooCommerceClient } from '@/lib/woocommerce/client';

type Params = Promise<{ id: string }>;

export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  // Apply rate limiting (strict preset: 5/min - sensitive billing operation)
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.strict);
  if (rateLimitResult) return rateLimitResult;

  const { id } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single() as { data: { role: string; company_id: string | null } | null };

  // Check authorization - user must be admin or belong to the company
  if (profile?.role !== 'admin' && profile?.company_id !== id) {
    return NextResponse.json(
      { error: 'Not authorized to pause this subscription' },
      { status: 403 }
    );
  }

  // Get company
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('woo_customer_id, status')
    .eq('id', id)
    .single() as { data: { woo_customer_id: string | null; status: string } | null; error: unknown };

  if (companyError || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  if (company.status !== 'active') {
    return NextResponse.json(
      { error: 'Subscription is not currently active' },
      { status: 400 }
    );
  }

  if (!company.woo_customer_id) {
    return NextResponse.json(
      { error: 'No WooCommerce subscription linked' },
      { status: 400 }
    );
  }

  try {
    // Call WooCommerce to suspend the subscription
    const woo = new WooCommerceClient();
    const subscription = await woo.suspendSubscription(
      parseInt(company.woo_customer_id)
    );

    // Update local status
    await (supabase
      .from('companies') as unknown as { update: (data: { status: string }) => { eq: (col: string, val: string) => Promise<void> } })
      .update({ status: 'paused' })
      .eq('id', id);

    return NextResponse.json({
      message: 'Subscription paused successfully',
      pauseDate: subscription.next_payment_date,
    });
  } catch (error) {
    console.error('Error pausing subscription:', error);
    return NextResponse.json(
      { error: 'Failed to pause subscription' },
      { status: 500 }
    );
  }
}
