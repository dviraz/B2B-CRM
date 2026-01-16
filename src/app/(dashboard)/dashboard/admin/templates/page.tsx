'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, FileText, MoreVertical, Pencil, Trash2, Loader2 } from 'lucide-react';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TemplateEditor } from '@/components/template-editor';
import type { RequestTemplate } from '@/types';

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<RequestTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<RequestTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTemplate, setDeleteTemplate] = useState<RequestTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates?includeInactive=true');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSave = async (data: Partial<RequestTemplate>) => {
    const url = selectedTemplate
      ? `/api/templates/${selectedTemplate.id}`
      : '/api/templates';
    const method = selectedTemplate ? 'PATCH' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save template');
    }

    await fetchTemplates();
    setSelectedTemplate(null);
    setIsCreating(false);
  };

  const handleDelete = async () => {
    if (!deleteTemplate) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/templates/${deleteTemplate.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      await fetchTemplates();
      setDeleteTemplate(null);
    } catch {
      // Error handled silently
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (isCreating || selectedTemplate) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <TemplateEditor
          template={selectedTemplate || undefined}
          onSave={handleSave}
          onDelete={
            selectedTemplate
              ? async () => {
                  setDeleteTemplate(selectedTemplate);
                  setSelectedTemplate(null);
                }
              : undefined
          }
          onCancel={() => {
            setSelectedTemplate(null);
            setIsCreating(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/dashboard/admin">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Request Templates</h1>
          <p className="text-muted-foreground">
            Create and manage templates for quick request creation
          </p>
        </div>

        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Templates Yet</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              Create templates to help clients quickly submit requests with pre-filled information.
            </p>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card
              key={template.id}
              className={!template.is_active ? 'opacity-60' : ''}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    {template.category && (
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedTemplate(template)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteTemplate(template)}
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
                {template.description && (
                  <CardDescription className="mb-3 line-clamp-2">
                    {template.description}
                  </CardDescription>
                )}

                <div className="flex flex-wrap gap-2">
                  <Badge className={priorityColors[template.default_priority]}>
                    {template.default_priority}
                  </Badge>
                  {template.default_sla_hours && (
                    <Badge variant="outline">
                      {template.default_sla_hours}h SLA
                    </Badge>
                  )}
                  {template.is_global && (
                    <Badge variant="secondary">Global</Badge>
                  )}
                  {!template.is_active && (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={() => setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTemplate?.name}&quot;. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
