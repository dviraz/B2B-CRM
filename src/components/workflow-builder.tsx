'use client';

import { useState } from 'react';
import { Plus, Trash2, Save, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { WorkflowRule, TriggerType, ActionType } from '@/types';

interface WorkflowBuilderProps {
  workflow?: WorkflowRule;
  onSave: (data: Partial<WorkflowRule>) => Promise<void>;
  onCancel: () => void;
}

const triggerTypes: { value: TriggerType; label: string; description: string }[] = [
  { value: 'status_change', label: 'Status Change', description: 'When request status changes' },
  { value: 'due_date_approaching', label: 'Due Date Approaching', description: 'Before due date' },
  { value: 'comment_added', label: 'Comment Added', description: 'When a comment is added' },
  { value: 'assignment_change', label: 'Assignment Change', description: 'When request is assigned' },
  { value: 'sla_breach', label: 'SLA Breach', description: 'When SLA is breached' },
];

const actionTypes: { value: ActionType; label: string; description: string }[] = [
  { value: 'notify', label: 'Send Notification', description: 'Notify users in-app' },
  { value: 'assign', label: 'Assign Request', description: 'Assign to team member' },
  { value: 'change_status', label: 'Change Status', description: 'Update request status' },
  { value: 'change_priority', label: 'Change Priority', description: 'Update request priority' },
  { value: 'send_email', label: 'Send Email', description: 'Send email notification' },
  { value: 'webhook', label: 'Trigger Webhook', description: 'Call external webhook' },
];

const statusOptions = ['queue', 'in_progress', 'review', 'revision', 'completed', 'cancelled'];
const priorityOptions = ['low', 'normal', 'high'];

interface TriggerCondition {
  type: TriggerType;
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

export function WorkflowBuilder({
  workflow,
  onSave,
  onCancel,
}: WorkflowBuilderProps) {
  const [name, setName] = useState(workflow?.name || '');
  const [description, setDescription] = useState(workflow?.description || '');
  const [isActive, setIsActive] = useState(workflow?.is_active ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Parse existing conditions/actions or use defaults
  const existingConditions = workflow?.trigger_conditions as TriggerCondition | undefined;
  const existingActionsConfig = workflow?.action_config as { actions?: ActionConfig[] } | undefined;
  const existingActions = existingActionsConfig?.actions;

  const [triggerType, setTriggerType] = useState<TriggerType>(
    existingConditions?.type || 'status_change'
  );
  const [fromStatus, setFromStatus] = useState(
    existingConditions?.from_status || ''
  );
  const [toStatus, setToStatus] = useState(
    existingConditions?.to_status || ''
  );
  const [hoursBefore, setHoursBefore] = useState(
    existingConditions?.hours_before?.toString() || '24'
  );

  const [actions, setActions] = useState<ActionConfig[]>(
    existingActions || [{ type: 'notify', message: '' }]
  );

  const addAction = () => {
    setActions([...actions, { type: 'notify', message: '' }]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, updates: Partial<ActionConfig>) => {
    setActions(
      actions.map((action, i) => (i === index ? { ...action, ...updates } : action))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const triggerConditions: TriggerCondition = { type: triggerType };

      if (triggerType === 'status_change') {
        if (fromStatus) triggerConditions.from_status = fromStatus;
        if (toStatus) triggerConditions.to_status = toStatus;
      } else if (triggerType === 'due_date_approaching') {
        triggerConditions.hours_before = parseInt(hoursBefore) || 24;
      }

      await onSave({
        name,
        description: description || null,
        trigger_type: triggerType,
        trigger_conditions: triggerConditions as unknown as Record<string, unknown>,
        action_type: actions[0]?.type || 'notify',
        action_config: { actions } as unknown as Record<string, unknown>,
        is_active: isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          {workflow ? 'Edit Workflow' : 'Create Workflow'}
        </CardTitle>
        <CardDescription>
          Automate actions based on request events
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workflow Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Notify on completion"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this workflow do?"
                rows={2}
              />
            </div>
          </div>

          {/* Trigger Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">When this happens...</h3>

            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select value={triggerType} onValueChange={(v) => setTriggerType(v as TriggerType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {triggerTypes.map((trigger) => (
                    <SelectItem key={trigger.value} value={trigger.value}>
                      <div>
                        <div>{trigger.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {trigger.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {triggerType === 'status_change' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>From Status (optional)</Label>
                  <Select value={fromStatus} onValueChange={setFromStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any status</SelectItem>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To Status (optional)</Label>
                  <Select value={toStatus} onValueChange={setToStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any status</SelectItem>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {triggerType === 'due_date_approaching' && (
              <div className="space-y-2">
                <Label htmlFor="hoursBefore">Hours Before Due Date</Label>
                <Input
                  id="hoursBefore"
                  type="number"
                  min="1"
                  value={hoursBefore}
                  onChange={(e) => setHoursBefore(e.target.value)}
                  placeholder="24"
                />
              </div>
            )}
          </div>

          {/* Actions Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Do these actions...</h3>
              <Button type="button" variant="outline" size="sm" onClick={addAction}>
                <Plus className="h-4 w-4 mr-1" />
                Add Action
              </Button>
            </div>

            <div className="space-y-3">
              {actions.map((action, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <Label>Action Type</Label>
                        <Select
                          value={action.type}
                          onValueChange={(v) => updateAction(index, { type: v as ActionType })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {actionTypes.map((at) => (
                              <SelectItem key={at.value} value={at.value}>
                                {at.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {actions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAction(index)}
                          className="ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {action.type === 'change_status' && (
                      <div className="space-y-2">
                        <Label>New Status</Label>
                        <Select
                          value={action.target_status || ''}
                          onValueChange={(v) => updateAction(index, { target_status: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status.replace('_', ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {(action.type === 'notify' || action.type === 'send_email') && (
                      <div className="space-y-2">
                        <Label>Message</Label>
                        <Textarea
                          value={action.message || ''}
                          onChange={(e) => updateAction(index, { message: e.target.value })}
                          placeholder="Notification message..."
                          rows={2}
                        />
                        <p className="text-xs text-muted-foreground">
                          Use {'{request_title}'}, {'{request_id}'}, {'{status}'} as placeholders
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Active</Label>
              <p className="text-xs text-muted-foreground">
                Enable this workflow to run automatically
              </p>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Workflow'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
