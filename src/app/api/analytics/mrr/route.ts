import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/analytics/mrr - Get total MRR
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can view MRR
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
    // Call the database function to get total MRR
    const { data, error } = await supabase.rpc('get_total_mrr');

    if (error) {
      console.error('Error getting MRR:', error);
      // Fallback to manual calculation if function doesn't exist
      const { data: services } = await supabase
        .from('client_services')
        .select('price, billing_cycle, status, service_type, company_id')
        .eq('status', 'active')
        .eq('service_type', 'subscription');

      // Get active companies
      const { data: activeCompanies } = await supabase
        .from('companies')
        .select('id')
        .eq('status', 'active');

      const activeCompanyIds = new Set(activeCompanies?.map(c => c.id) || []);

      const totalMrr = (services || [])
        .filter(s => activeCompanyIds.has(s.company_id))
        .reduce((total, s) => {
          const price = s.price || 0;
          switch (s.billing_cycle) {
            case 'monthly': return total + price;
            case 'quarterly': return total + price / 3;
            case 'yearly': return total + price / 12;
            default: return total;
          }
        }, 0);

      return NextResponse.json({ total_mrr: totalMrr });
    }

    return NextResponse.json({ total_mrr: data || 0 });
  } catch (error) {
    console.error('Error calculating MRR:', error);
    return NextResponse.json({ total_mrr: 0 });
  }
}
