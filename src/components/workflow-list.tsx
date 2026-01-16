'use client';

import { Zap, MoreVertical, Pencil, Trash2, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WorkflowRule, TriggerType, ActionType } from '@/types';

interface WorkflowListProps {
  workflows: WorkflowRule[];
  onEdit: (workflow: WorkflowRule) => void;
  onDelete: (workflow: WorkflowRule) => void;
  onToggle: (workflow: WorkflowRule) => void;
}

const triggerLabels: Record<TriggerType, string> = {
  status_change: 'Status Change',
  due_date_approaching: 'Due Date Approaching',
  comment_added: 'Comment Added',
  assignment_change: 'Assignment Change',
  sla_breach: 'SLA Breach',
};

const actionLabels: Record<ActionType, string> = {
  notify: 'Send Notification',
  assign: 'Assign Request',
  change_status: 'Change Status',
  change_priority: 'Change Priority',
  send_email: 'Send Email',
  webhook: 'Trigger Webhook',
};

const triggerColors: Record<TriggerType, string> = {
  status_change: 'bg-blue-100 text-blue-700',
  due_date_approaching: 'bg-orange-100 text-orange-700',
  comment_added: 'bg-green-100 text-green-700',
  assignment_change: 'bg-purple-100 text-purple-700',
  sla_breach: 'bg-red-100 text-red-700',
};

export function WorkflowList({
  workflows,
  onEdit,
  onDelete,
  onToggle,
}: WorkflowListProps) {
  if (workflows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Zap className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Workflows Yet</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            Create workflows to automate actions when certain events occur.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {workflows.map((workflow) => (
        <Card
          key={workflow.id}
          className={!workflow.is_active ? 'opacity-60' : ''}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    workflow.is_active ? 'bg-primary/10' : 'bg-muted'
                  }`}
                >
                  <Zap
                    className={`h-4 w-4 ${
                      workflow.is_active ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                </div>
                <div>
                  <CardTitle className="text-base">{workflow.name}</CardTitle>
                  {workflow.description && (
                    <CardDescription className="mt-1">
                      {workflow.description}
                    </CardDescription>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(workflow)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onToggle(workflow)}>
                    {workflow.is_active ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Disable
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Enable
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(workflow)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <span className="text-muted-foreground">When:</span>
                <span className={triggerColors[workflow.trigger_type]}>
                  {triggerLabels[workflow.trigger_type]}
                </span>
              </Badge>

              <span className="text-muted-foreground">&rarr;</span>

              <Badge variant="outline" className="gap-1">
                <span className="text-muted-foreground">Then:</span>
                {actionLabels[workflow.action_type]}
              </Badge>

              {!workflow.is_active && (
                <Badge variant="secondary">Disabled</Badge>
              )}

              {workflow.execution_count > 0 && (
                <Badge variant="outline" className="ml-auto">
                  {workflow.execution_count} executions
                </Badge>
              )}
            </div>

            {/* Show trigger details */}
            {workflow.trigger_conditions && (
              <div className="mt-3 text-xs text-muted-foreground">
                {workflow.trigger_type === 'status_change' && (
                  <>
                    {(workflow.trigger_conditions as { from_status?: string }).from_status && (
                      <span>
                        From: {(workflow.trigger_conditions as { from_status: string }).from_status}{' '}
                      </span>
                    )}
                    {(workflow.trigger_conditions as { to_status?: string }).to_status && (
                      <span>
                        To: {(workflow.trigger_conditions as { to_status: string }).to_status}
                      </span>
                    )}
                  </>
                )}
                {workflow.trigger_type === 'due_date_approaching' && (
                  <span>
                    {(workflow.trigger_conditions as { hours_before?: number }).hours_before || 24} hours before due
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
