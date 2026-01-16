import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/analytics - Get analytics data
export async function GET(request: Request) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null };

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get all requests for analytics
  const { data: requests } = await supabase
    .from('requests')
    .select('id, status, priority, created_at, completed_at, due_date, sla_status, assigned_to, company_id')
    .gte('created_at', startDate.toISOString()) as { data: Array<{
      id: string;
      status: string;
      priority: string;
      created_at: string;
      completed_at: string | null;
      due_date: string | null;
      sla_status: string | null;
      assigned_to: string | null;
      company_id: string;
    }> | null };

  if (!requests) {
    return NextResponse.json({
      overview: { total: 0, completed: 0, active: 0, avgCompletionTime: 0 },
      statusDistribution: [],
      priorityDistribution: [],
      requestVolume: [],
      slaCompliance: { onTrack: 0, atRisk: 0, breached: 0 },
      teamWorkload: [],
    });
  }

  // Overview metrics
  const total = requests.length;
  const completed = requests.filter((r) => r.status === 'done').length;
  const active = requests.filter((r) => r.status === 'active').length;

  // Average completion time (in hours)
  const completedRequests = requests.filter((r) => r.completed_at);
  let avgCompletionTime = 0;
  if (completedRequests.length > 0) {
    const totalTime = completedRequests.reduce((sum, r) => {
      const created = new Date(r.created_at);
      const completed = new Date(r.completed_at!);
      return sum + (completed.getTime() - created.getTime());
    }, 0);
    avgCompletionTime = Math.round(totalTime / completedRequests.length / (1000 * 60 * 60)); // hours
  }

  // Status distribution
  const statusDistribution = ['queue', 'active', 'review', 'done'].map((status) => ({
    name: status,
    value: requests.filter((r) => r.status === status).length,
  }));

  // Priority distribution
  const priorityDistribution = ['low', 'normal', 'high'].map((priority) => ({
    name: priority,
    value: requests.filter((r) => r.priority === priority).length,
  }));

  // Request volume over time (daily)
  const volumeMap = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    volumeMap.set(dateStr, 0);
  }

  requests.forEach((r) => {
    const dateStr = r.created_at.split('T')[0];
    if (volumeMap.has(dateStr)) {
      volumeMap.set(dateStr, (volumeMap.get(dateStr) || 0) + 1);
    }
  });

  const requestVolume = Array.from(volumeMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  // SLA compliance
  const requestsWithSla = requests.filter((r) => r.sla_status);
  const slaCompliance = {
    onTrack: requestsWithSla.filter((r) => r.sla_status === 'on_track').length,
    atRisk: requestsWithSla.filter((r) => r.sla_status === 'at_risk').length,
    breached: requestsWithSla.filter((r) => r.sla_status === 'breached').length,
    total: requestsWithSla.length,
  };

  // Team workload
  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'admin') as { data: Array<{ id: string; full_name: string | null; email: string }> | null };

  const teamWorkload = (teamMembers || []).map((member) => {
    const assigned = requests.filter((r) => r.assigned_to === member.id);
    return {
      id: member.id,
      name: member.full_name || member.email,
      total: assigned.length,
      active: assigned.filter((r) => r.status === 'active').length,
      completed: assigned.filter((r) => r.status === 'done').length,
    };
  });

  return NextResponse.json({
    overview: {
      total,
      completed,
      active,
      avgCompletionTime,
    },
    statusDistribution,
    priorityDistribution,
    requestVolume,
    slaCompliance,
    teamWorkload,
  });
}
