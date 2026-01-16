'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { WorkflowBuilder } from '@/components/workflow-builder';
import { WorkflowList } from '@/components/workflow-list';
import type { WorkflowRule } from '@/types';

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteWorkflow, setDeleteWorkflow] = useState<WorkflowRule | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows');
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleSave = async (data: Partial<WorkflowRule>) => {
    const url = selectedWorkflow
      ? `/api/workflows/${selectedWorkflow.id}`
      : '/api/workflows';
    const method = selectedWorkflow ? 'PATCH' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save workflow');
    }

    await fetchWorkflows();
    setSelectedWorkflow(null);
    setIsCreating(false);
  };

  const handleDelete = async () => {
    if (!deleteWorkflow) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/workflows/${deleteWorkflow.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete workflow');
      }

      await fetchWorkflows();
      setDeleteWorkflow(null);
    } catch {
      // Error handled silently
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggle = async (workflow: WorkflowRule) => {
    try {
      const response = await fetch(`/api/workflows/${workflow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !workflow.is_active }),
      });

      if (response.ok) {
        await fetchWorkflows();
      }
    } catch {
      // Silently fail
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

  if (isCreating || selectedWorkflow) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <WorkflowBuilder
          workflow={selectedWorkflow || undefined}
          onSave={handleSave}
          onCancel={() => {
            setSelectedWorkflow(null);
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
          <h1 className="text-2xl font-bold">Workflow Automation</h1>
          <p className="text-muted-foreground">
            Create automated workflows triggered by request events
          </p>
        </div>

        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Workflow
        </Button>
      </div>

      {/* Workflows List */}
      <WorkflowList
        workflows={workflows}
        onEdit={setSelectedWorkflow}
        onDelete={setDeleteWorkflow}
        onToggle={handleToggle}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteWorkflow} onOpenChange={() => setDeleteWorkflow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteWorkflow?.name}&quot;. This action
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
