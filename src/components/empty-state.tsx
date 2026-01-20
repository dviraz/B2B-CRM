'use client';

import { ReactNode } from 'react';
import {
  FileText,
  Users,
  Building2,
  Inbox,
  Search,
  Plus,
  Settings,
  Bell,
  Workflow,
  FileCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-4 rounded-full bg-muted p-4">
          <div className="h-8 w-8 text-muted-foreground">{icon}</div>
        </div>
      )}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {(action || secondaryAction) && (
        <div className="mt-6 flex gap-3">
          {action && (
            <Button onClick={action.onClick}>
              <Plus className="mr-2 h-4 w-4" />
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-configured empty states for common use cases

export function NoRequestsEmptyState({
  onCreateRequest,
  isClient = true,
}: {
  onCreateRequest?: () => void;
  isClient?: boolean;
}) {
  return (
    <EmptyState
      icon={<Inbox className="h-8 w-8" />}
      title="No requests yet"
      description={
        isClient
          ? "You haven't created any requests yet. Submit your first request to get started with our services."
          : 'No requests found for this filter. Adjust your filters or create a new request.'
      }
      action={
        onCreateRequest
          ? { label: 'Create Request', onClick: onCreateRequest }
          : undefined
      }
    />
  );
}

export function NoSearchResultsEmptyState({
  searchTerm,
  onClearSearch,
}: {
  searchTerm: string;
  onClearSearch: () => void;
}) {
  return (
    <EmptyState
      icon={<Search className="h-8 w-8" />}
      title="No results found"
      description={`We couldn't find any results for "${searchTerm}". Try adjusting your search or filters.`}
      action={{ label: 'Clear Search', onClick: onClearSearch }}
    />
  );
}

export function NoCompaniesEmptyState({
  onCreateCompany,
}: {
  onCreateCompany?: () => void;
}) {
  return (
    <EmptyState
      icon={<Building2 className="h-8 w-8" />}
      title="No companies yet"
      description="Companies will appear here when customers sign up through WooCommerce, or you can add them manually."
      action={
        onCreateCompany
          ? { label: 'Add Company', onClick: onCreateCompany }
          : undefined
      }
    />
  );
}

export function NoCommentsEmptyState({ isInternal = false }: { isInternal?: boolean }) {
  return (
    <EmptyState
      icon={<FileText className="h-8 w-8" />}
      title={isInternal ? 'No internal notes' : 'No comments yet'}
      description={
        isInternal
          ? 'Internal notes are only visible to your team. Add notes to track important information.'
          : 'Start the conversation by adding a comment. Your client will be notified.'
      }
    />
  );
}

export function NoNotificationsEmptyState() {
  return (
    <EmptyState
      icon={<Bell className="h-8 w-8" />}
      title="All caught up!"
      description="You have no new notifications. We'll notify you when something needs your attention."
    />
  );
}

export function NoTeamMembersEmptyState({
  onInviteUser,
}: {
  onInviteUser?: () => void;
}) {
  return (
    <EmptyState
      icon={<Users className="h-8 w-8" />}
      title="No team members yet"
      description="Invite team members to collaborate on client requests and manage your agency."
      action={
        onInviteUser ? { label: 'Invite Team Member', onClick: onInviteUser } : undefined
      }
    />
  );
}

export function NoTemplatesEmptyState({
  onCreateTemplate,
}: {
  onCreateTemplate?: () => void;
}) {
  return (
    <EmptyState
      icon={<FileCode className="h-8 w-8" />}
      title="No templates yet"
      description="Create request templates to standardize common request types and speed up submissions."
      action={
        onCreateTemplate
          ? { label: 'Create Template', onClick: onCreateTemplate }
          : undefined
      }
    />
  );
}

export function NoWorkflowsEmptyState({
  onCreateWorkflow,
}: {
  onCreateWorkflow?: () => void;
}) {
  return (
    <EmptyState
      icon={<Workflow className="h-8 w-8" />}
      title="No workflows yet"
      description="Automate your processes with workflow rules. Trigger actions based on request events."
      action={
        onCreateWorkflow
          ? { label: 'Create Workflow', onClick: onCreateWorkflow }
          : undefined
      }
    />
  );
}

export function NoFilesEmptyState() {
  return (
    <EmptyState
      icon={<FileText className="h-8 w-8" />}
      title="No files uploaded"
      description="Drag and drop files here or click to upload. Share assets, documents, or any relevant files."
    />
  );
}

export function ErrorEmptyState({
  title = 'Something went wrong',
  description = 'We encountered an error loading this content. Please try again.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={<Settings className="h-8 w-8 animate-spin" />}
      title={title}
      description={description}
      action={onRetry ? { label: 'Retry', onClick: onRetry } : undefined}
    />
  );
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
