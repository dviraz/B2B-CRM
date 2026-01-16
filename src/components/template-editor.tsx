'use client';

import { useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { RequestTemplate, Priority } from '@/types';

interface TemplateEditorProps {
  template?: RequestTemplate;
  onSave: (data: Partial<RequestTemplate>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}

const priorityOptions: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
];

export function TemplateEditor({
  template,
  onSave,
  onDelete,
  onCancel,
}: TemplateEditorProps) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [titleTemplate, setTitleTemplate] = useState(template?.title_template || '');
  const [descriptionTemplate, setDescriptionTemplate] = useState(
    template?.description_template || ''
  );
  const [defaultPriority, setDefaultPriority] = useState<Priority>(
    template?.default_priority || 'normal'
  );
  const [defaultSlaHours, setDefaultSlaHours] = useState<string>(
    template?.default_sla_hours?.toString() || ''
  );
  const [category, setCategory] = useState(template?.category || '');
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [isGlobal, setIsGlobal] = useState(template?.is_global ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      await onSave({
        name,
        description: description || null,
        title_template: titleTemplate,
        description_template: descriptionTemplate || null,
        default_priority: defaultPriority,
        default_sla_hours: defaultSlaHours ? parseInt(defaultSlaHours) : null,
        category: category || null,
        is_active: isActive,
        is_global: isGlobal,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{template ? 'Edit Template' : 'Create Template'}</CardTitle>
        <CardDescription>
          Templates help clients quickly create requests with pre-filled information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Template Information</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Social Media Ad"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Marketing, Design"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this template..."
                rows={2}
              />
            </div>
          </div>

          {/* Template Content */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Request Defaults</h3>

            <div className="space-y-2">
              <Label htmlFor="titleTemplate">Default Title *</Label>
              <Input
                id="titleTemplate"
                value={titleTemplate}
                onChange={(e) => setTitleTemplate(e.target.value)}
                placeholder="e.g., Facebook Ad Creative - [Campaign Name]"
                required
              />
              <p className="text-xs text-muted-foreground">
                This will pre-fill the request title
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descriptionTemplate">Default Description</Label>
              <Textarea
                id="descriptionTemplate"
                value={descriptionTemplate}
                onChange={(e) => setDescriptionTemplate(e.target.value)}
                placeholder="Pre-filled description with instructions..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Markdown supported. Include placeholders for clients to fill in.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="priority">Default Priority</Label>
                <select
                  id="priority"
                  value={defaultPriority}
                  onChange={(e) => setDefaultPriority(e.target.value as Priority)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slaHours">Default SLA (hours)</Label>
                <Input
                  id="slaHours"
                  type="number"
                  min="1"
                  value={defaultSlaHours}
                  onChange={(e) => setDefaultSlaHours(e.target.value)}
                  placeholder="e.g., 48"
                />
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Settings</h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Make this template available for use
                </p>
              </div>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isGlobal">Global Template</Label>
                <p className="text-xs text-muted-foreground">
                  Available to all companies (admin only)
                </p>
              </div>
              <Switch
                id="isGlobal"
                checked={isGlobal}
                onCheckedChange={setIsGlobal}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-between">
            {template && onDelete ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" disabled={isDeleting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete &quot;{template.name}&quot;. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Template'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
