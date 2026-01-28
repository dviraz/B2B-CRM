import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit, RateLimitPresets } from '@/lib/rate-limit';
import { validateBody, bulkRequestSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  // Apply rate limiting for mutations: 60 requests per minute
  const rateLimitResult = await applyRateLimit(request, RateLimitPresets.mutation);
  if (rateLimitResult) return rateLimitResult;

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
      { error: 'Only admins can perform bulk actions' },
      { status: 403 }
    );
  }

  // Validate request body
  const { data: body, error: validationError } = await validateBody(request, bulkRequestSchema);
  if (validationError || !body) {
    return NextResponse.json({ error: validationError || 'Invalid request body' }, { status: 400 });
  }

  const { request_ids, action, value } = body;

  let result: { success: boolean; updated?: number; deleted?: number; error?: string };

  try {
    switch (action) {
      case 'update_status': {
        if (!value || !['queue', 'active', 'review', 'done'].includes(value)) {
          return NextResponse.json(
            { error: 'Valid status value is required' },
            { status: 400 }
          );
        }
        const updates: Record<string, unknown> = { status: value };
        if (value === 'done') {
          updates.completed_at = new Date().toISOString();
        }
        const { error } = await (supabase.from('requests') as any)
          .update(updates)
          .in('id', request_ids) as { error: unknown };
        if (error) throw error;
        result = { success: true, updated: request_ids.length };
        break;
      }

      case 'update_priority': {
        if (!value || !['low', 'normal', 'high'].includes(value)) {
          return NextResponse.json(
            { error: 'Valid priority value is required' },
            { status: 400 }
          );
        }
        const { error } = await (supabase.from('requests') as any)
          .update({ priority: value })
          .in('id', request_ids) as { error: unknown };
        if (error) throw error;
        result = { success: true, updated: request_ids.length };
        break;
      }

      case 'assign': {
        if (!value) {
          return NextResponse.json(
            { error: 'User ID value is required for assignment' },
            { status: 400 }
          );
        }
        // Verify assignee exists and is admin
        const { data: assignee } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', value)
          .single() as { data: { id: string; role: string } | null };

        if (!assignee || assignee.role !== 'admin') {
          return NextResponse.json(
            { error: 'Invalid assignee' },
            { status: 400 }
          );
        }

        // Update requests
        const { error } = await (supabase.from('requests') as any)
          .update({ assigned_to: value })
          .in('id', request_ids) as { error: unknown };
        if (error) throw error;

        // Create assignments for each request
        const assignments = request_ids.map((requestId: string) => ({
          request_id: requestId,
          assigned_to: value,
          assigned_by: user.id,
          status: 'assigned',
        }));

        // Insert assignments (ignore conflicts)
        await (supabase.from('request_assignments') as any)
          .upsert(assignments, {
            onConflict: 'request_id,assigned_to',
            ignoreDuplicates: true,
          });

        result = { success: true, updated: request_ids.length };
        break;
      }

      case 'delete': {
        const { error } = await supabase
          .from('requests')
          .delete()
          .in('id', request_ids) as { error: unknown };
        if (error) throw error;
        result = { success: true, deleted: request_ids.length };
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error performing bulk action:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk action' },
      { status: 500 }
    );
  }
}
