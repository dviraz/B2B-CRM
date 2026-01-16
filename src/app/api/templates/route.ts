import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
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

  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category');
  const activeOnly = searchParams.get('active') !== 'false';

  let query = supabase
    .from('request_templates')
    .select('*')
    .order('name', { ascending: true });

  // Filter by active status
  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  // Filter by category
  if (category) {
    query = query.eq('category', category);
  }

  // Non-admins can only see global templates or their company's templates
  if (profile?.role !== 'admin') {
    query = query.or(`is_global.eq.true,company_id.eq.${profile?.company_id}`);
  }

  const { data, error } = await query as { data: Array<Record<string, unknown>> | null; error: unknown };

  if (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null };

  if (profile?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can create templates' },
      { status: 403 }
    );
  }

  const body = await request.json();

  if (!body.name?.trim() || !body.title_template?.trim()) {
    return NextResponse.json(
      { error: 'name and title_template are required' },
      { status: 400 }
    );
  }

  const { data, error } = await (supabase
    .from('request_templates') as any)
    .insert({
      company_id: body.company_id || null,
      name: body.name.trim(),
      description: body.description || null,
      title_template: body.title_template.trim(),
      description_template: body.description_template || null,
      default_priority: body.default_priority || 'normal',
      default_sla_hours: body.default_sla_hours || null,
      category: body.category || null,
      is_active: body.is_active !== false,
      is_global: body.is_global || false,
      created_by: user.id,
    })
    .select()
    .single() as { data: Record<string, unknown> | null; error: unknown };

  if (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
