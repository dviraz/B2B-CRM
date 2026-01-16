import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single() as { data: { role: string; company_id: string } | null };

  const searchParams = request.nextUrl.searchParams;
  const statusFilter = searchParams.get('status');
  const companyFilter = searchParams.get('company_id');
  const searchQuery = searchParams.get('q');
  const priorityFilter = searchParams.get('priority');
  const assigneeFilter = searchParams.get('assignee');
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');

  // Pagination parameters with sensible defaults to prevent fetching entire dataset
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500); // Max 500
  const offset = parseInt(searchParams.get('offset') || '0');

  let query = supabase
    .from('requests')
    .select(`
      *,
      company:companies(id, name, status, plan_tier),
      assignee:profiles!requests_assigned_to_fkey(id, email, full_name, avatar_url)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply search query (search in title and description)
  if (searchQuery) {
    query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
  }

  // Apply status filter if provided
  if (statusFilter) {
    // Support comma-separated statuses
    const statuses = statusFilter.split(',');
    if (statuses.length === 1) {
      query = query.eq('status', statuses[0]);
    } else {
      query = query.in('status', statuses);
    }
  }

  // Apply priority filter
  if (priorityFilter) {
    const priorities = priorityFilter.split(',');
    if (priorities.length === 1) {
      query = query.eq('priority', priorities[0]);
    } else {
      query = query.in('priority', priorities);
    }
  }

  // Apply assignee filter
  if (assigneeFilter) {
    query = query.eq('assigned_to', assigneeFilter);
  }

  // Apply date range filters
  if (dateFrom) {
    query = query.gte('due_date', dateFrom);
  }
  if (dateTo) {
    query = query.lte('due_date', dateTo);
  }

  // Non-admins can only see their company's requests
  if (profile?.role !== 'admin') {
    if (!profile?.company_id) {
      return NextResponse.json([]);
    }
    query = query.eq('company_id', profile.company_id);
  } else if (companyFilter) {
    // Admins can filter by company
    query = query.eq('company_id', companyFilter);
  }

  const { data, error } = await query as { data: Array<Record<string, unknown>> | null; error: unknown };

  if (error) {
    console.error('Error fetching requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
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

  // Get user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single() as { data: { role: string; company_id: string } | null };

  if (!profile?.company_id && profile?.role !== 'admin') {
    return NextResponse.json(
      { error: 'No company associated with user' },
      { status: 403 }
    );
  }

  // Check company status (non-admins only)
  if (profile?.role !== 'admin') {
    const { data: company } = await supabase
      .from('companies')
      .select('status')
      .eq('id', profile.company_id!)
      .single() as { data: { status: string } | null };

    if (company?.status !== 'active') {
      return NextResponse.json(
        { error: 'Your subscription is not active. Please update your billing.' },
        { status: 403 }
      );
    }
  }

  const body = await request.json();

  // Validate required fields
  if (!body.title?.trim()) {
    return NextResponse.json(
      { error: 'Title is required' },
      { status: 400 }
    );
  }

  // For admins, allow specifying company_id
  const companyId = profile?.role === 'admin' && body.company_id
    ? body.company_id
    : profile?.company_id;

  if (!companyId) {
    return NextResponse.json(
      { error: 'Company ID is required' },
      { status: 400 }
    );
  }

  const { data, error } = await (supabase
    .from('requests') as any)
    .insert({
      company_id: companyId,
      title: body.title.trim(),
      description: body.description || null,
      status: 'queue', // Always starts in queue
      priority: body.priority || 'normal',
      assets_link: body.assets_link || null,
      video_brief: body.video_brief || null,
      due_date: body.due_date || null,
    })
    .select(`
      *,
      company:companies(id, name, status, plan_tier),
      assignee:profiles!requests_assigned_to_fkey(id, email, full_name, avatar_url)
    `)
    .single() as { data: Record<string, unknown> | null; error: unknown };

  if (error) {
    console.error('Error creating request:', error);
    return NextResponse.json(
      { error: 'Failed to create request' },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
