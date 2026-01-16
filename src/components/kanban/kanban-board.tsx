'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import type { Request, RequestStatus } from '@/types';

const COLUMNS: { id: RequestStatus; title: string }[] = [
  { id: 'queue', title: 'Queue' },
  { id: 'active', title: 'In Progress' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Complete' },
];

interface KanbanBoardProps {
  requests: Request[];
  isAdmin: boolean;
  companyMaxActive?: number;
  onMoveRequest: (requestId: string, newStatus: RequestStatus) => Promise<void>;
  onRequestClick: (request: Request) => void;
  isSelectionMode?: boolean;
  isSelected?: (id: string) => boolean;
  onToggleSelect?: (id: string) => void;
}

export function KanbanBoard({
  requests,
  isAdmin,
  companyMaxActive = 1,
  onMoveRequest,
  onRequestClick,
  isSelectionMode = false,
  isSelected,
  onToggleSelect,
}: KanbanBoardProps) {
  const [activeRequest, setActiveRequest] = useState<Request | null>(null);
  const [localRequests, setLocalRequests] = useState<Request[]>(requests);

  useEffect(() => {
    setLocalRequests(requests);
  }, [requests]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getRequestsByStatus = (status: RequestStatus) => {
    return localRequests.filter((r) => r.status === status);
  };

  const activeCount = getRequestsByStatus('active').length;

  const handleDragStart = (event: DragStartEvent) => {
    const request = localRequests.find((r) => r.id === event.active.id);
    if (request) {
      setActiveRequest(request);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveRequest(null);

    if (!over) return;

    const requestId = active.id as string;
    const newStatus = over.id as RequestStatus;

    const request = localRequests.find((r) => r.id === requestId);
    if (!request || request.status === newStatus) return;

    // Client-side validation
    if (newStatus === 'active' && !isAdmin) {
      // Clients cannot move to active
      return;
    }

    if (newStatus === 'active' && activeCount >= companyMaxActive) {
      // Would exceed limit
      return;
    }

    // Optimistic update
    setLocalRequests((prev) =>
      prev.map((r) =>
        r.id === requestId ? { ...r, status: newStatus } : r
      )
    );

    try {
      await onMoveRequest(requestId, newStatus);
    } catch {
      // Revert on error
      setLocalRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, status: request.status } : r
        )
      );
    }
  };

  const canDropInColumn = (status: RequestStatus): boolean => {
    if (!activeRequest) return true;

    // Cannot drop in same column
    if (activeRequest.status === status) return true;

    // Only admins can move to active
    if (status === 'active' && !isAdmin) return false;

    // Check active limit
    if (status === 'active' && activeCount >= companyMaxActive) return false;

    // Clients can only move from review to done
    if (!isAdmin) {
      if (activeRequest.status === 'review' && status === 'done') return true;
      return false;
    }

    return true;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            requests={getRequestsByStatus(column.id)}
            isDropDisabled={!canDropInColumn(column.id) || isSelectionMode}
            showLimit={column.id === 'active'}
            currentCount={column.id === 'active' ? activeCount : undefined}
            maxCount={column.id === 'active' ? companyMaxActive : undefined}
            onRequestClick={onRequestClick}
            isSelectionMode={isSelectionMode}
            isSelected={isSelected}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>

      <DragOverlay>
        {activeRequest ? (
          <KanbanCard request={activeRequest} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
