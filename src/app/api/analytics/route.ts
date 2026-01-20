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

  // Get team members first (needed for workload calculation)
  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'admin') as { data: Array<{ id: string; full_name: string | null; email: string }> | null };

  // SINGLE-PASS ALGORITHM: Calculate all metrics in one loop through requests
  // Instead of ~15 separate filter operations, we do everything in one pass
  const statusCounts = { queue: 0, active: 0, review: 0, done: 0 };
  const priorityCounts = { low: 0, normal: 0, high: 0 };
  const slaCounts = { on_track: 0, at_risk: 0, breached: 0, total: 0 };

  // Initialize volume map for daily counts
  const volumeMap = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    volumeMap.set(date.toISOString().split('T')[0], 0);
  }

  // Initialize team workload tracking
  const teamWorkloadMap = new Map<string, { total: number; active: number; completed: number }>();
  (teamMembers || []).forEach((m) => {
    teamWorkloadMap.set(m.id, { total: 0, active: 0, completed: 0 });
  });

  // Completion time tracking
  let completedCount = 0;
  let totalCompletionTime = 0;

  // SINGLE PASS through all requests
  for (const r of requests) {
    // Status counts
    if (r.status in statusCounts) {
      statusCounts[r.status as keyof typeof statusCounts]++;
    }

    // Priority counts
    if (r.priority in priorityCounts) {
      priorityCounts[r.priority as keyof typeof priorityCounts]++;
    }

    // SLA counts
    if (r.sla_status) {
      slaCounts.total++;
      if (r.sla_status in slaCounts) {
        slaCounts[r.sla_status as keyof typeof slaCounts]++;
      }
    }

    // Volume by date
    const dateStr = r.created_at.split('T')[0];
    if (volumeMap.has(dateStr)) {
      volumeMap.set(dateStr, (volumeMap.get(dateStr) || 0) + 1);
    }

    // Completion time calculation
    if (r.completed_at) {
      completedCount++;
      const created = new Date(r.created_at);
      const completed = new Date(r.completed_at);
      totalCompletionTime += completed.getTime() - created.getTime();
    }

    // Team workload
    if (r.assigned_to && teamWorkloadMap.has(r.assigned_to)) {
      const workload = teamWorkloadMap.get(r.assigned_to)!;
      workload.total++;
      if (r.status === 'active') workload.active++;
      if (r.status === 'done') workload.completed++;
    }
  }

  // Build final response objects from the single-pass results
  const total = requests.length;
  const completed = statusCounts.done;
  const active = statusCounts.active;
  const avgCompletionTime = completedCount > 0
    ? Math.round(totalCompletionTime / completedCount / (1000 * 60 * 60))
    : 0;

  const statusDistribution = ['queue', 'active', 'review', 'done'].map((status) => ({
    name: status,
    value: statusCounts[status as keyof typeof statusCounts],
  }));

  const priorityDistribution = ['low', 'normal', 'high'].map((priority) => ({
    name: priority,
    value: priorityCounts[priority as keyof typeof priorityCounts],
  }));

  const requestVolume = Array.from(volumeMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  const slaCompliance = {
    onTrack: slaCounts.on_track,
    atRisk: slaCounts.at_risk,
    breached: slaCounts.breached,
    total: slaCounts.total,
  };

  const teamWorkload = (teamMembers || []).map((member) => {
    const workload = teamWorkloadMap.get(member.id) || { total: 0, active: 0, completed: 0 };
    return {
      id: member.id,
      name: member.full_name || member.email,
      total: workload.total,
      active: workload.active,
      completed: workload.completed,
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
