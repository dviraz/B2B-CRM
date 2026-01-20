import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { Errors, handleError, successResponse, logger } from '@/lib/errors';
import { object, oneOf } from '@/lib/validation';
import { createWorkflowEngine } from '@/lib/workflows/engine';
import type { RequestStatus, Request } from '@/types';

type Params = Promise<{ id: string }>;

// Define valid status transitions
const VALID_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  queue: ['active', 'done'],
  active: ['review', 'queue'],
  review: ['done', 'active'],
  done: ['queue'],
};

// Validation schema
const moveSchema = {
  status: oneOf(['queue', 'active', 'review', 'done'] as const),
};

export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimit(request, 'write');
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    const { id } = await params;
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return handleError(Errors.unauthorized());
    }

    // Validate request body
    const body = await request.json();
    const validation = object(moveSchema)(body);

    if (!validation.success) {
      return handleError(Errors.validation('Invalid status', { errors: validation.errors }));
    }

    const newStatus = validation.data!.status as RequestStatus;

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return handleError(Errors.unauthorized());
    }

    const isAdmin = profile.role === 'admin';

    // Get current request
    const { data: currentRequest, error: requestError } = await supabase
      .from('requests')
      .select('*, company:companies(id, max_active_limit, status)')
      .eq('id', id)
      .single();

    if (requestError || !currentRequest) {
      return handleError(Errors.notFound('Request'));
    }

    const currentStatus = currentRequest.status as RequestStatus;

    // Validate status transition
    if (!VALID_TRANSITIONS[currentStatus]?.includes(newStatus)) {
      return handleError(Errors.invalidStatusTransition(currentStatus, newStatus));
    }

    // Only admins can move requests to "active"
    if (newStatus === 'active' && !isAdmin) {
      return handleError(Errors.forbidden('Only admins can activate requests'));
    }

    // Check active request limit when moving to active
    if (newStatus === 'active') {
      const company = currentRequest.company as {
        id: string;
        max_active_limit: number;
        status: string;
      };

      const { count } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentRequest.company_id)
        .eq('status', 'active');

      if (count !== null && count >= company.max_active_limit) {
        return handleError(
          Errors.limitReached(
            `Client has reached their active request limit (${company.max_active_limit}). Complete or archive an active request first.`,
            { limit: company.max_active_limit, current: count }
          )
        );
      }
    }

    // Clients can only move their own company's requests (from review to done)
    if (!isAdmin) {
      if (currentRequest.company_id !== profile.company_id) {
        return handleError(Errors.forbidden('Not authorized to move this request'));
      }

      if (!(currentStatus === 'review' && newStatus === 'done')) {
        return handleError(Errors.forbidden('Clients can only mark reviewed requests as complete'));
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Set completed_at when marking as done
    if (newStatus === 'done' && currentStatus !== 'done') {
      updateData.completed_at = new Date().toISOString();
    }

    // Clear completed_at when reopening
    if (currentStatus === 'done' && newStatus !== 'done') {
      updateData.completed_at = null;
    }

    // Update the request status
    const { data, error } = await supabase
      .from('requests')
      .update(updateData)
      .eq('id', id)
      .select('*, company:companies(id, name, status, plan_tier)')
      .single();

    if (error) {
      logger.error('Error moving request', error, { requestId: id, newStatus });
      return handleError(Errors.database('Failed to move request'));
    }

    // Log activity
    await supabase.from('activities').insert({
      request_id: id,
      user_id: user.id,
      activity_type: 'status_change',
      description: `Status changed from ${currentStatus} to ${newStatus}`,
      metadata: {
        from_status: currentStatus,
        to_status: newStatus,
      },
    });

    // Trigger workflow engine
    try {
      const workflowEngine = createWorkflowEngine(supabase);
      await workflowEngine.onStatusChange(
        data as Request,
        currentStatus,
        newStatus,
        user.id
      );
    } catch (workflowError) {
      // Log but don't fail the request
      logger.error('Workflow execution failed', workflowError, { requestId: id });
    }

    logger.info('Request status changed', {
      requestId: id,
      from: currentStatus,
      to: newStatus,
      userId: user.id,
    });

    return successResponse(data);
  } catch (error) {
    return handleError(error);
  }
}
