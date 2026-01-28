import { SupabaseClient } from '@supabase/supabase-js';
import { sendStatusChangeEmail } from '@/lib/email';
import type { WorkflowRule, TriggerType, ActionType, Request } from '@/types';

interface TriggerConditions {
  type?: TriggerType;
  from_status?: string;
  to_status?: string;
  hours_before?: number;
}

interface ActionConfig {
  type: ActionType;
  target_status?: string;
  user_id?: string;
  message?: string;
}

interface WorkflowContext {
  request: Request;
  previousStatus?: string;
  newStatus?: string;
  triggeredBy?: string;
}

/**
 * Workflow Engine - Executes automated workflows based on request events
 */
export class WorkflowEngine {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Process workflows triggered by status change
   */
  async onStatusChange(
    request: Request,
    previousStatus: string,
    newStatus: string,
    triggeredBy: string
  ): Promise<void> {
    const workflows = await this.getActiveWorkflows('status_change');

    for (const workflow of workflows) {
      const conditions = workflow.trigger_conditions as unknown as TriggerConditions;

      // Check if conditions match
      if (conditions.from_status && conditions.from_status !== previousStatus) {
        continue;
      }
      if (conditions.to_status && conditions.to_status !== newStatus) {
        continue;
      }

      // Execute workflow
      await this.executeWorkflow(workflow, {
        request,
        previousStatus,
        newStatus,
        triggeredBy,
      });
    }
  }

  /**
   * Process workflows triggered by comment
   */
  async onCommentAdded(request: Request, triggeredBy: string): Promise<void> {
    const workflows = await this.getActiveWorkflows('comment_added');

    for (const workflow of workflows) {
      await this.executeWorkflow(workflow, {
        request,
        triggeredBy,
      });
    }
  }

  /**
   * Process workflows for approaching due dates
   * This should be called by a scheduled job
   */
  async checkDueDateWorkflows(): Promise<void> {
    const workflows = await this.getActiveWorkflows('due_date_approaching');

    for (const workflow of workflows) {
      const conditions = workflow.trigger_conditions as unknown as TriggerConditions;
      const hoursBefore = conditions.hours_before || 24;

      // Find requests with due dates approaching
      const { data: requests } = await (this.supabase
        .from('requests') as ReturnType<typeof this.supabase.from>)
        .select('*')
        .not('due_date', 'is', null)
        .not('status', 'in', '(completed,cancelled)')
        .gte('due_date', new Date().toISOString())
        .lte(
          'due_date',
          new Date(Date.now() + hoursBefore * 60 * 60 * 1000).toISOString()
        ) as { data: Request[] | null };

      if (!requests) continue;

      for (const request of requests) {
        // Check if we already executed this workflow for this request recently
        const alreadyExecuted = await this.hasRecentExecution(
          workflow.id,
          request.id
        );

        if (!alreadyExecuted) {
          await this.executeWorkflow(workflow, { request });
        }
      }
    }
  }

  /**
   * Get active workflows by trigger type
   */
  private async getActiveWorkflows(
    triggerType: TriggerType
  ): Promise<WorkflowRule[]> {
    const { data } = await (this.supabase
      .from('workflow_rules') as ReturnType<typeof this.supabase.from>)
      .select('*')
      .eq('trigger_type', triggerType)
      .eq('is_active', true) as { data: WorkflowRule[] | null };

    return data || [];
  }

  /**
   * Check if workflow was recently executed for this request
   */
  private async hasRecentExecution(
    workflowId: string,
    requestId: string
  ): Promise<boolean> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data } = await (this.supabase
      .from('workflow_executions') as ReturnType<typeof this.supabase.from>)
      .select('id')
      .eq('workflow_id', workflowId)
      .eq('request_id', requestId)
      .gte('executed_at', oneDayAgo)
      .limit(1) as { data: { id: string }[] | null };

    return (data?.length ?? 0) > 0;
  }

  /**
   * Execute a workflow
   */
  private async executeWorkflow(
    workflow: WorkflowRule,
    context: WorkflowContext
  ): Promise<void> {
    const config = workflow.action_config as { actions?: ActionConfig[] } | ActionConfig;
    const actionList = 'actions' in config && Array.isArray(config.actions)
      ? config.actions
      : [config as ActionConfig];

    try {
      for (const action of actionList) {
        await this.executeAction(action, context);
      }

      // Log successful execution
      await this.logExecution(workflow.id, context.request.id, true);

      // Increment execution count
      await (this.supabase.from('workflow_rules') as ReturnType<typeof this.supabase.from>)
        .update({ execution_count: workflow.execution_count + 1 })
        .eq('id', workflow.id);
    } catch (error) {
      // Log failed execution
      await this.logExecution(
        workflow.id,
        context.request.id,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: ActionConfig,
    context: WorkflowContext
  ): Promise<void> {
    const message = this.interpolateMessage(
      action.message || '',
      context
    );

    switch (action.type) {
      case 'notify':
        await this.sendNotification(context.request, message);
        break;

      case 'change_status':
        if (action.target_status) {
          await this.changeStatus(context.request, action.target_status);
        }
        break;

      case 'assign':
        if (action.user_id) {
          await this.assignRequest(context.request, action.user_id);
        }
        break;

      case 'send_email':
        await this.sendEmailNotification(context.request, message, context);
        break;
    }
  }

  /**
   * Send notification to request assignee and company admins
   */
  private async sendNotification(
    request: Request,
    message: string
  ): Promise<void> {
    const recipients: string[] = [];

    // Add assignee if exists
    if (request.assigned_to) {
      recipients.push(request.assigned_to);
    }

    // Get company admins to notify
    const { data: companyUsers } = await (this.supabase
      .from('profiles') as ReturnType<typeof this.supabase.from>)
      .select('id')
      .eq('company_id', request.company_id)
      .eq('role', 'admin') as { data: { id: string }[] | null };

    if (companyUsers) {
      for (const user of companyUsers) {
        if (!recipients.includes(user.id)) {
          recipients.push(user.id);
        }
      }
    }

    for (const userId of recipients) {
      await (this.supabase.from('notifications') as ReturnType<typeof this.supabase.from>)
        .insert({
          user_id: userId,
          type: 'status_change',
          title: 'Workflow Notification',
          message: message || `Update on: ${request.title}`,
          request_id: request.id,
        });
    }
  }

  /**
   * Change request status
   */
  private async changeStatus(
    request: Request,
    newStatus: string
  ): Promise<void> {
    const updateData: Record<string, unknown> = { status: newStatus };

    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    await (this.supabase.from('requests') as ReturnType<typeof this.supabase.from>)
      .update(updateData)
      .eq('id', request.id);
  }

  /**
   * Assign request to user
   */
  private async assignRequest(
    request: Request,
    userId: string
  ): Promise<void> {
    await (this.supabase.from('requests') as ReturnType<typeof this.supabase.from>)
      .update({ assigned_to: userId })
      .eq('id', request.id);
  }

  /**
   * Send email notification to relevant users
   */
  private async sendEmailNotification(
    request: Request,
    _message: string,
    context: WorkflowContext
  ): Promise<void> {
    // Get users who should receive email notifications
    const recipients: Array<{ email: string; name: string | null }> = [];

    // Get assignee if exists
    if (request.assigned_to) {
      const { data: assignee } = await (this.supabase
        .from('profiles') as ReturnType<typeof this.supabase.from>)
        .select('email, full_name')
        .eq('id', request.assigned_to)
        .single() as { data: { email: string; full_name: string | null } | null };

      if (assignee) {
        // Check notification preferences
        const { data: prefs } = await (this.supabase
          .from('notification_preferences') as ReturnType<typeof this.supabase.from>)
          .select('email_on_status_change')
          .eq('user_id', request.assigned_to)
          .single() as { data: { email_on_status_change: boolean } | null };

        if (!prefs || prefs.email_on_status_change !== false) {
          recipients.push({ email: assignee.email, name: assignee.full_name });
        }
      }
    }

    // Get company users who should be notified
    const { data: companyUsers } = await (this.supabase
      .from('profiles') as ReturnType<typeof this.supabase.from>)
      .select('id, email, full_name')
      .eq('company_id', request.company_id) as { data: Array<{ id: string; email: string; full_name: string | null }> | null };

    if (companyUsers) {
      for (const user of companyUsers) {
        // Skip if already added
        if (recipients.some(r => r.email === user.email)) continue;

        // Check notification preferences
        const { data: prefs } = await (this.supabase
          .from('notification_preferences') as ReturnType<typeof this.supabase.from>)
          .select('email_on_status_change')
          .eq('user_id', user.id)
          .single() as { data: { email_on_status_change: boolean } | null };

        if (!prefs || prefs.email_on_status_change !== false) {
          recipients.push({ email: user.email, name: user.full_name });
        }
      }
    }

    // Send emails
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const requestUrl = `${appUrl}/dashboard?request=${request.id}`;

    for (const recipient of recipients) {
      if (context.previousStatus && context.newStatus) {
        await sendStatusChangeEmail(
          recipient.email,
          request.title,
          context.previousStatus,
          context.newStatus,
          requestUrl,
          recipient.name || undefined
        );
      }
    }
  }

  /**
   * Log workflow execution
   */
  private async logExecution(
    workflowId: string,
    requestId: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    await (this.supabase.from('workflow_executions') as ReturnType<typeof this.supabase.from>)
      .insert({
        workflow_id: workflowId,
        request_id: requestId,
        success,
        error_message: errorMessage,
      });
  }

  /**
   * Interpolate placeholders in message
   */
  private interpolateMessage(
    message: string,
    context: WorkflowContext
  ): string {
    return message
      .replace('{request_title}', context.request.title)
      .replace('{request_id}', context.request.id)
      .replace('{status}', context.newStatus || context.request.status);
  }
}

/**
 * Create a workflow engine instance
 */
export function createWorkflowEngine(supabase: SupabaseClient): WorkflowEngine {
  return new WorkflowEngine(supabase);
}
