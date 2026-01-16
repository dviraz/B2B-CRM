'use client';

import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { FilterValues } from '@/components/advanced-filters';

interface FilterBadgesProps {
  filters: FilterValues;
  onRemove: (key: keyof FilterValues, value?: string) => void;
  teamMembers?: Array<{ id: string; full_name: string | null; email: string }>;
}

export function FilterBadges({ filters, onRemove, teamMembers = [] }: FilterBadgesProps) {
  const badges: Array<{ key: keyof FilterValues; label: string; value?: string }> = [];

  // Status badges
  filters.status?.forEach((status) => {
    const statusLabels: Record<string, string> = {
      queue: 'Queue',
      active: 'In Progress',
      review: 'Review',
      done: 'Complete',
    };
    badges.push({
      key: 'status',
      label: `Status: ${statusLabels[status] || status}`,
      value: status,
    });
  });

  // Priority badges
  filters.priority?.forEach((priority) => {
    badges.push({
      key: 'priority',
      label: `Priority: ${priority.charAt(0).toUpperCase() + priority.slice(1)}`,
      value: priority,
    });
  });

  // Date range badges
  if (filters.dateFrom) {
    badges.push({
      key: 'dateFrom',
      label: `From: ${format(filters.dateFrom, 'MMM d, yyyy')}`,
    });
  }
  if (filters.dateTo) {
    badges.push({
      key: 'dateTo',
      label: `To: ${format(filters.dateTo, 'MMM d, yyyy')}`,
    });
  }

  // Assignee badge
  if (filters.assigneeId) {
    const assignee = teamMembers.find((m) => m.id === filters.assigneeId);
    badges.push({
      key: 'assigneeId',
      label: `Assignee: ${assignee?.full_name || assignee?.email || 'Unknown'}`,
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge, index) => (
        <Badge
          key={`${badge.key}-${badge.value || index}`}
          variant="secondary"
          className="gap-1 pr-1"
        >
          {badge.label}
          <button
            onClick={() => onRemove(badge.key, badge.value)}
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
