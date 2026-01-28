import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit, RateLimitPresets } from '@/lib/rate-limit';
import { validateBody, createFileSchema } from '@/lib/validations';

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  // Apply rate limiting (read preset: 120/min)
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.read);
  if (rateLimitResult) return rateLimitResult;

  const { id: requestId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user profile to check access
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single() as { data: { role: string; company_id: string | null } | null };

  // Verify request access for non-admins
  if (profile?.role !== 'admin') {
    const { data: targetRequest } = await supabase
      .from('requests')
      .select('company_id')
      .eq('id', requestId)
      .single() as { data: { company_id: string } | null };

    if (!targetRequest || targetRequest.company_id !== profile?.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from('files')
    .select(`
      *,
      uploader:profiles(id, email, full_name, avatar_url)
    `)
    .eq('request_id', requestId)
    .order('created_at', { ascending: false }) as { data: Array<Record<string, unknown>> | null; error: unknown };

  if (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  // Apply rate limiting (mutation preset: 60/min)
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.mutation);
  if (rateLimitResult) return rateLimitResult;

  const { id: requestId } = await params;
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

  // Verify request exists and user has access
  const { data: targetRequest } = await supabase
    .from('requests')
    .select('company_id, company:companies(status)')
    .eq('id', requestId)
    .single() as { data: { company_id: string; company: { status: string } | null } | null };

  if (!targetRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  // Non-admins can only upload to their company's requests
  if (profile?.role !== 'admin' && targetRequest.company_id !== profile?.company_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Check company status for non-admins
  if (profile?.role !== 'admin' && targetRequest.company?.status !== 'active') {
    return NextResponse.json(
      { error: 'Cannot upload files while subscription is not active' },
      { status: 403 }
    );
  }

  // Validate request body
  const { data: body, error: validationError } = await validateBody(request, createFileSchema);
  if (validationError || !body) {
    return NextResponse.json({ error: validationError || 'Invalid request body' }, { status: 400 });
  }

  // Determine file type
  let fileType = 'other';
  const mimeType = body.mime_type?.toLowerCase() || '';
  if (mimeType.startsWith('image/')) fileType = 'image';
  else if (mimeType.startsWith('video/')) fileType = 'video';
  else if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) fileType = 'document';
  else if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) fileType = 'archive';

  const { data, error } = await (supabase
    .from('files') as any)
    .insert({
      request_id: requestId,
      uploaded_by: user.id,
      file_name: body.file_name,
      file_size: body.file_size,
      file_type: fileType,
      mime_type: body.mime_type || 'application/octet-stream',
      storage_path: body.storage_path,
      storage_url: body.storage_url,
      thumbnail_url: body.thumbnail_url || null,
    })
    .select(`
      *,
      uploader:profiles(id, email, full_name, avatar_url)
    `)
    .single() as { data: Record<string, unknown> | null; error: unknown };

  if (error) {
    console.error('Error creating file record:', error);
    return NextResponse.json(
      { error: 'Failed to create file record' },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  // Apply rate limiting (mutation preset: 60/min)
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.mutation);
  if (rateLimitResult) return rateLimitResult;

  const { id: requestId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const fileId = searchParams.get('file_id');

  if (!fileId) {
    return NextResponse.json(
      { error: 'file_id is required' },
      { status: 400 }
    );
  }

  // Get file info to check ownership and get storage path
  const { data: file } = await supabase
    .from('files')
    .select('uploaded_by, storage_path')
    .eq('id', fileId)
    .eq('request_id', requestId)
    .single() as { data: { uploaded_by: string; storage_path: string } | null };

  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // Check if user is admin or the uploader
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null };

  if (profile?.role !== 'admin' && file.uploaded_by !== user.id) {
    return NextResponse.json(
      { error: 'Only admins or the uploader can delete files' },
      { status: 403 }
    );
  }

  // Delete from storage first
  const { error: storageError } = await supabase.storage
    .from('request-files')
    .remove([file.storage_path]);

  if (storageError) {
    console.error('Error deleting file from storage:', storageError);
    // Continue anyway to delete the record
  }

  // Delete the record
  const { error } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId) as { error: unknown };

  if (error) {
    console.error('Error deleting file record:', error);
    return NextResponse.json(
      { error: 'Failed to delete file record' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
