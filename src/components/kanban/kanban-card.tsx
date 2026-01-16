'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Link, Video, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DueDateBadge } from '@/components/sla-indicator';
import { cn } from '@/lib/utils';
import type { Request, Priority } from '@/types';

interface KanbanCardProps {
  request: Request;
  isDragging?: boolean;
  onClick?: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

const priorityColors: Record<Priority, string> = {
  low: 'bg-slate-100 text-slate-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-red-100 text-red-700',
};

export function KanbanCard({
  request,
  isDragging = false,
  onClick,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: request.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isBeingDragged = isDragging || isSortableDragging;

  const handleClick = () => {
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect();
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-3 cursor-pointer hover:shadow-md transition-shadow',
        isBeingDragged && 'opacity-50 shadow-lg rotate-2',
        isSelected && 'ring-2 ring-primary bg-primary/5'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-2">
        {isSelectionMode ? (
          <div
            className={cn(
              'mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center',
              isSelected
                ? 'bg-primary border-primary text-primary-foreground'
                : 'border-muted-foreground'
            )}
          >
            {isSelected && <Check className="h-3 w-3" />}
          </div>
        ) : (
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{request.title}</h4>

          {request.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {request.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge
              variant="secondary"
              className={cn('text-xs', priorityColors[request.priority])}
            >
              {request.priority}
            </Badge>

            {request.due_date && (
              <DueDateBadge
                dueDate={request.due_date}
                completedAt={request.completed_at}
              />
            )}

            {request.assets_link && (
              <Link className="h-3 w-3 text-muted-foreground" />
            )}

            {request.video_brief && (
              <Video className="h-3 w-3 text-muted-foreground" />
            )}
          </div>

          {/* Assignee */}
          {request.assignee && (
            <div className="flex items-center justify-end mt-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {request.assignee.full_name?.[0] || request.assignee.email?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
