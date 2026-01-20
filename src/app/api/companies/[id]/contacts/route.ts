import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Contact } from '@/types/database';

type Params = Promise<{ id: string }>;

// GET /api/companies/[id]/contacts - List all contacts for a company
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { id: companyId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has access to this company
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // Clients can only see contacts from their own company
  if (profile.role !== 'admin' && profile.company_id !== companyId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const activeOnly = searchParams.get('active_only') === 'true';
  const primaryOnly = searchParams.get('primary_only') === 'true';

  let query = supabase
    .from('contacts')
    .select('*')
    .eq('company_id', companyId)
    .order('is_primary', { ascending: false })
    .order('name', { ascending: true });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  if (primaryOnly) {
    query = query.eq('is_primary', true);
  }

  const { data: contacts, error } = await query;

  if (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }

  return NextResponse.json(contacts);
}

// POST /api/companies/[id]/contacts - Create a new contact
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { id: companyId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can create contacts
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

  // Verify company exists
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .eq('id', companyId)
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  const body = await request.json();
  const { name, email, phone, role, is_primary, is_billing_contact, notes } = body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json(
      { error: 'Contact name is required' },
      { status: 400 }
    );
  }

  const contactData: Partial<Contact> = {
    company_id: companyId,
    name: name.trim(),
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    role: role?.trim() || null,
    is_primary: is_primary ?? false,
    is_billing_contact: is_billing_contact ?? false,
    is_active: true,
    notes: notes?.trim() || null,
  };

  const { data: newContact, error } = await supabase
    .from('contacts')
    .insert(contactData)
    .select()
    .single();

  if (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }

  return NextResponse.json(newContact, { status: 201 });
}
