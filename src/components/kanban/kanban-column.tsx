'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { KanbanCard } from './kanban-card';
import type { Request, RequestStatus } from '@/types';

interface KanbanColumnProps {
  id: RequestStatus;
  title: string;
  requests: Request[];
  isDropDisabled?: boolean;
  showLimit?: boolean;
  currentCount?: number;
  maxCount?: number;
  onRequestClick: (request: Request) => void;
  isSelectionMode?: boolean;
  isSelected?: (id: string) => boolean;
  onToggleSelect?: (id: string) => void;
}

export function KanbanColumn({
  id,
  title,
  requests,
  isDropDisabled = false,
  showLimit = false,
  currentCount,
  maxCount,
  onRequestClick,
  isSelectionMode = false,
  isSelected,
  onToggleSelect,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: isDropDisabled,
  });

  const isAtLimit = showLimit && currentCount !== undefined && maxCount !== undefined && currentCount >= maxCount;

  return (
    <div className="flex-shrink-0 w-72">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">
          {title}
          <span className="ml-2 text-muted-foreground">({requests.length})</span>
        </h3>
        {showLimit && currentCount !== undefined && maxCount !== undefined && (
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              isAtLimit
                ? 'bg-destructive/10 text-destructive'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {currentCount}/{maxCount}
          </span>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[500px] p-2 rounded-lg transition-colors',
          'bg-muted/50',
          isOver && !isDropDisabled && 'bg-primary/10 ring-2 ring-primary/20',
          isOver && isDropDisabled && 'bg-destructive/10 ring-2 ring-destructive/20'
        )}
      >
        <SortableContext
          items={requests.map((r) => r.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {requests.map((request) => (
              <KanbanCard
                key={request.id}
                request={request}
                onClick={() => onRequestClick(request)}
                isSelectionMode={isSelectionMode}
                isSelected={isSelected?.(request.id)}
                onToggleSelect={() => onToggleSelect?.(request.id)}
              />
            ))}
          </div>
        </SortableContext>

        {requests.length === 0 && (
          <div className="h-20 flex items-center justify-center text-sm text-muted-foreground">
            No requests
          </div>
        )}
      </div>
    </div>
  );
}
