import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = Promise<{ id: string; contactId: string }>;

// GET /api/companies/[id]/contacts/[contactId] - Get a single contact
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { id: companyId, contactId } = await params;
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
    .single<{ role: string; company_id: string | null }>();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if (profile.role !== 'admin' && profile.company_id !== companyId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: contact, error } = await (supabase
    .from('contacts') as ReturnType<typeof supabase.from>)
    .select('*')
    .eq('id', contactId)
    .eq('company_id', companyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch contact' },
      { status: 500 }
    );
  }

  return NextResponse.json(contact);
}

// PUT /api/companies/[id]/contacts/[contactId] - Update a contact
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { id: companyId, contactId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can update contacts
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

  // Verify contact exists and belongs to company
  const { data: existingContact, error: fetchError } = await (supabase
    .from('contacts') as ReturnType<typeof supabase.from>)
    .select('id')
    .eq('id', contactId)
    .eq('company_id', companyId)
    .single();

  if (fetchError || !existingContact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  const body = await request.json();
  const { name, email, phone, role, is_primary, is_billing_contact, is_active, notes } = body;

  const updateData: Record<string, unknown> = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Contact name cannot be empty' },
        { status: 400 }
      );
    }
    updateData.name = name.trim();
  }

  if (email !== undefined) updateData.email = email?.trim() || null;
  if (phone !== undefined) updateData.phone = phone?.trim() || null;
  if (role !== undefined) updateData.role = role?.trim() || null;
  if (is_primary !== undefined) updateData.is_primary = is_primary;
  if (is_billing_contact !== undefined) updateData.is_billing_contact = is_billing_contact;
  if (is_active !== undefined) updateData.is_active = is_active;
  if (notes !== undefined) updateData.notes = notes?.trim() || null;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'No fields to update' },
      { status: 400 }
    );
  }

  const { data: updatedContact, error } = await (supabase
    .from('contacts') as ReturnType<typeof supabase.from>)
    .update(updateData)
    .eq('id', contactId)
    .select()
    .single();

  if (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    );
  }

  return NextResponse.json(updatedContact);
}

// DELETE /api/companies/[id]/contacts/[contactId] - Delete a contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { id: companyId, contactId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can delete contacts
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

  // Verify contact exists and belongs to company
  const { data: existingContact, error: fetchError } = await (supabase
    .from('contacts') as ReturnType<typeof supabase.from>)
    .select('id')
    .eq('id', contactId)
    .eq('company_id', companyId)
    .single();

  if (fetchError || !existingContact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  const { error } = await (supabase
    .from('contacts') as ReturnType<typeof supabase.from>)
    .delete()
    .eq('id', contactId);

  if (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
