'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DueDatePicker } from '@/components/due-date-picker';
import { TemplateSelector } from '@/components/template-selector';
import type { RequestTemplate } from '@/types';

interface NewRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    priority: string;
    assets_link?: string;
    video_brief?: string;
    due_date?: string;
  }) => Promise<void>;
  disabled?: boolean;
}

export function NewRequestDialog({
  open,
  onOpenChange,
  onSubmit,
  disabled = false,
}: NewRequestDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [assetsLink, setAssetsLink] = useState('');
  const [videoBrief, setVideoBrief] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleTemplateSelect = (template: RequestTemplate) => {
    setTitle(template.title_template);
    if (template.description_template) {
      setDescription(template.description_template);
    }
    setPriority(template.default_priority);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit({
        title,
        description: description || undefined,
        priority,
        assets_link: assetsLink || undefined,
        video_brief: videoBrief || undefined,
        due_date: dueDate ? dueDate.toISOString() : undefined,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setPriority('normal');
      setAssetsLink('');
      setVideoBrief('');
      setDueDate(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Request</DialogTitle>
          <DialogDescription>
            Submit a new request to your queue. Our team will review and work on
            it based on your plan&apos;s active request limit.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-sm text-muted-foreground">Start from a template</span>
          <TemplateSelector onSelect={handleTemplateSelect} disabled={disabled} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Facebook Ads Creative Q1"
              required
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you need..."
              rows={4}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              Markdown is supported
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                disabled={disabled}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <DueDatePicker
                value={dueDate}
                onChange={setDueDate}
                disabled={disabled}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assets">Assets Link</Label>
            <Input
              id="assets"
              type="url"
              value={assetsLink}
              onChange={(e) => setAssetsLink(e.target.value)}
              placeholder="https://drive.google.com/..."
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              Google Drive, Dropbox, or any file sharing link
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="video">Video Brief</Label>
            <Input
              id="video"
              type="url"
              value={videoBrief}
              onChange={(e) => setVideoBrief(e.target.value)}
              placeholder="https://loom.com/..."
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              Loom or video link explaining your request
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || disabled}>
              {isSubmitting ? 'Creating...' : 'Create Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
