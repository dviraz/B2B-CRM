import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { applyRateLimit, RateLimitPresets } from '@/lib/rate-limit';
import { leadIngestSchema, validateBody } from '@/lib/validations';

// Map serviceType to a human-readable title
function getServiceTitle(serviceType: string): string {
  const titles: Record<string, string> = {
    seo: 'SEO & Local Search',
    website: 'Website Design',
    ads: 'Paid Advertising',
    content: 'Content Marketing',
    automation: 'Marketing Automation',
    custom: 'Custom Project',
  };
  return titles[serviceType] || serviceType;
}

export async function POST(request: NextRequest) {
  // Apply rate limiting: 100 requests per minute per IP
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.webhook);
  if (rateLimitResult) return rateLimitResult;

  try {
    // Verify API key
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.LEADS_INGEST_API_KEY;

    if (!apiKey) {
      console.error('LEADS_INGEST_API_KEY not configured');
      return NextResponse.json(
        { error: 'Lead ingestion not configured' },
        { status: 503 }
      );
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const providedKey = authHeader.substring(7);
    if (providedKey !== apiKey) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Validate request body
    const { data, error } = await validateBody(request, leadIngestSchema);
    if (error || !data) {
      return NextResponse.json(
        { error: 'Invalid lead data', details: error },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { name, email, phone, company, serviceType, message, source } = data;
    const serviceTitle = getServiceTitle(serviceType);

    // Check if contact with this email already exists
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, company_id, company:companies(id, name, notes)')
      .eq('email', email)
      .single() as { data: { id: string; company_id: string; company: { id: string; name: string; notes: string | null } | null } | null };

    if (existingContact?.company_id) {
      // Duplicate: Create a follow-up request for existing company
      const existingCompany = existingContact.company;
      const companyId = existingContact.company_id;

      // Create follow-up request
      const { data: newRequest, error: requestError } = await supabase
        .from('requests')
        .insert({
          company_id: companyId,
          title: `Follow-up Lead - ${serviceTitle}`,
          description: `**New inquiry from existing contact**\n\n**Service Interest:** ${serviceTitle}\n**Message:**\n${message}\n\n---\n*Source: ${source}*`,
          status: 'queue',
          priority: 'normal',
        } as never)
        .select('id')
        .single() as { data: { id: string } | null; error: unknown };

      if (requestError) {
        console.error('Error creating follow-up request:', requestError);
        return NextResponse.json(
          { error: 'Failed to create follow-up request' },
          { status: 500 }
        );
      }

      // Append to company notes
      const existingNotes = existingCompany?.notes || '';
      const timestamp = new Date().toISOString().split('T')[0];
      const newNote = `\n\n---\n[${timestamp}] Follow-up inquiry (${serviceTitle}):\n${message}`;

      await supabase
        .from('companies')
        .update({ notes: existingNotes + newNote } as never)
        .eq('id', companyId);

      console.log('Follow-up lead created:', {
        email,
        companyId,
        requestId: newRequest?.id,
        source,
      });

      return NextResponse.json({
        success: true,
        duplicate: true,
        companyId,
        requestId: newRequest?.id,
      });
    }

    // New lead: Create Company → Contact → Request

    // 1. Create company (status: paused = lead, not active client)
    const { data: newCompany, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: company,
        status: 'paused',
        plan_tier: 'standard',
        max_active_limit: 1,
        notes: `**Lead Source:** ${source}\n**Service Interest:** ${serviceTitle}\n**Initial Message:**\n${message}`,
      } as never)
      .select('id')
      .single() as { data: { id: string } | null; error: unknown };

    if (companyError || !newCompany) {
      console.error('Error creating company:', companyError);
      return NextResponse.json(
        { error: 'Failed to create company' },
        { status: 500 }
      );
    }

    // 2. Create primary contact
    const { data: newContact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        company_id: newCompany.id,
        name,
        email,
        phone: phone || null,
        is_primary: true,
        is_billing_contact: true,
        is_active: true,
      } as never)
      .select('id')
      .single() as { data: { id: string } | null; error: unknown };

    if (contactError || !newContact) {
      console.error('Error creating contact:', contactError);
      // Rollback company creation
      await supabase.from('companies').delete().eq('id', newCompany.id);
      return NextResponse.json(
        { error: 'Failed to create contact' },
        { status: 500 }
      );
    }

    // 3. Update company with primary_contact_id
    await supabase
      .from('companies')
      .update({ primary_contact_id: newContact.id } as never)
      .eq('id', newCompany.id);

    // 4. Create initial request
    const { data: newRequest, error: requestError } = await supabase
      .from('requests')
      .insert({
        company_id: newCompany.id,
        title: `New Lead - ${serviceTitle}`,
        description: `**Contact:** ${name}\n**Email:** ${email}\n**Phone:** ${phone || 'Not provided'}\n**Company:** ${company}\n\n**Service Interest:** ${serviceTitle}\n**Message:**\n${message}\n\n---\n*Source: ${source}*`,
        status: 'queue',
        priority: 'normal',
      } as never)
      .select('id')
      .single() as { data: { id: string } | null; error: unknown };

    if (requestError) {
      console.error('Error creating request:', requestError);
      // Don't rollback - company and contact are still valuable
    }

    console.log('New lead created:', {
      email,
      companyId: newCompany.id,
      contactId: newContact.id,
      requestId: newRequest?.id,
      source,
    });

    return NextResponse.json({
      success: true,
      duplicate: false,
      companyId: newCompany.id,
      contactId: newContact.id,
      requestId: newRequest?.id,
    });

  } catch (error) {
    console.error('Lead ingestion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'leads/ingest' });
}
