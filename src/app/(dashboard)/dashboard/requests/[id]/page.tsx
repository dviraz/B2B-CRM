import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RequestDetailPage } from '@/components/request-detail-page';
import type { Request, Comment, Activity, FileUpload } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RequestPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  // Get the request with related data
  const { data: request, error } = await supabase
    .from('requests')
    .select(`
      *,
      company:companies(id, name, status, plan_tier, max_active_limit),
      assignee:profiles!requests_assigned_to_fkey(id, email, full_name, avatar_url)
    `)
    .eq('id', id)
    .single() as { data: Request | null; error: unknown };

  if (error || !request) {
    notFound();
  }

  // Check access for non-admins
  if (!isAdmin && request.company_id !== profile?.company_id) {
    notFound();
  }

  // Build comments query
  let commentsQuery = supabase
    .from('comments')
    .select(`
      *,
      user:profiles(id, email, full_name, avatar_url)
    `)
    .eq('request_id', id)
    .order('created_at', { ascending: true });

  // Non-admins can't see internal comments
  if (!isAdmin) {
    commentsQuery = commentsQuery.eq('is_internal', false);
  }

  const { data: comments } = await commentsQuery as { data: Comment[] | null };

  // Get activities
  const { data: activities } = await supabase
    .from('activities')
    .select(`
      *,
      user:profiles(id, email, full_name, avatar_url)
    `)
    .eq('request_id', id)
    .order('created_at', { ascending: false })
    .limit(50) as { data: Activity[] | null };

  // Get files
  const { data: files } = await supabase
    .from('files')
    .select(`
      *,
      uploader:profiles(id, email, full_name, avatar_url)
    `)
    .eq('request_id', id)
    .order('created_at', { ascending: false }) as { data: FileUpload[] | null };

  // Get team members for assignment (admin only)
  let teamMembers: { id: string; email: string; full_name: string | null; avatar_url: string | null }[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .eq('role', 'admin');
    teamMembers = data || [];
  }

  return (
    <RequestDetailPage
      request={request}
      comments={comments || []}
      activities={activities || []}
      files={files || []}
      isAdmin={isAdmin}
      currentUserId={user.id}
      teamMembers={teamMembers}
    />
  );
}
