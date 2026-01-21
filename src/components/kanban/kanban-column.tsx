'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Inbox, Play, Eye, CheckCircle2 } from 'lucide-react';
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

// Column configurations with colors and icons
const columnConfig: Record<RequestStatus, {
  icon: typeof Inbox;
  dotColor: string;
  headerGradient: string;
  emptyIcon: typeof Inbox;
  emptyText: string;
  emptySubtext: string;
}> = {
  queue: {
    icon: Inbox,
    dotColor: 'bg-slate-400',
    headerGradient: 'from-slate-500/10 to-transparent',
    emptyIcon: Inbox,
    emptyText: 'Queue is empty',
    emptySubtext: 'New requests will appear here',
  },
  active: {
    icon: Play,
    dotColor: 'bg-blue-500 animate-pulse-subtle',
    headerGradient: 'from-blue-500/10 to-transparent',
    emptyIcon: Play,
    emptyText: 'No active work',
    emptySubtext: 'Move requests here to start',
  },
  review: {
    icon: Eye,
    dotColor: 'bg-amber-500',
    headerGradient: 'from-amber-500/10 to-transparent',
    emptyIcon: Eye,
    emptyText: 'Nothing to review',
    emptySubtext: 'Completed work appears here',
  },
  done: {
    icon: CheckCircle2,
    dotColor: 'bg-emerald-500',
    headerGradient: 'from-emerald-500/10 to-transparent',
    emptyIcon: CheckCircle2,
    emptyText: 'No completed items',
    emptySubtext: 'Approved requests land here',
  },
};

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
  const config = columnConfig[id];
  const EmptyIcon = config.emptyIcon;

  return (
    <div className="flex-shrink-0 w-72">
      {/* Column Header with Gradient */}
      <div className={cn(
        'mb-3 flex items-center justify-between p-2 rounded-lg bg-gradient-to-r',
        config.headerGradient
      )}>
        <div className="flex items-center gap-2">
          {/* Animated Status Dot */}
          <div className="relative">
            <div className={cn('w-2 h-2 rounded-full', config.dotColor)} />
            {id === 'active' && requests.length > 0 && (
              <div className={cn('absolute inset-0 w-2 h-2 rounded-full animate-ping', config.dotColor, 'opacity-75')} />
            )}
          </div>
          <h3 className="font-semibold text-sm text-foreground">
            {title}
          </h3>
          {/* Card Count Badge */}
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
            {requests.length}
          </span>
        </div>
        {showLimit && currentCount !== undefined && maxCount !== undefined && (
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium transition-all',
              isAtLimit
                ? 'bg-destructive/15 text-destructive ring-1 ring-destructive/20'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {currentCount}/{maxCount}
          </span>
        )}
      </div>

      {/* Droppable Area with Glow Effect */}
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[500px] p-2 rounded-xl transition-all duration-200',
          'bg-muted/30 border border-transparent',
          // Hover over effect - glowing drop zone
          isOver && !isDropDisabled && 'bg-primary/5 border-primary/30 ring-2 ring-primary/20 shadow-lg shadow-primary/5',
          isOver && isDropDisabled && 'bg-destructive/5 border-destructive/30 ring-2 ring-destructive/20 shadow-lg shadow-destructive/5'
        )}
      >
        <SortableContext
          items={requests.map((r) => r.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {requests.map((request, index) => (
              <div
                key={request.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <KanbanCard
                  request={request}
                  onClick={() => onRequestClick(request)}
                  isSelectionMode={isSelectionMode}
                  isSelected={isSelected?.(request.id)}
                  onToggleSelect={() => onToggleSelect?.(request.id)}
                />
              </div>
            ))}
          </div>
        </SortableContext>

        {/* Rich Empty State */}
        {requests.length === 0 && (
          <div className="h-32 flex flex-col items-center justify-center text-center p-4">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center mb-2',
              'bg-muted/50'
            )}>
              <EmptyIcon className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {config.emptyText}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              {config.emptySubtext}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
