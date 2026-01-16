'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DueDatePicker } from '@/components/due-date-picker';
import type { Priority, RequestStatus } from '@/types';

export interface FilterValues {
  status?: RequestStatus[];
  priority?: Priority[];
  dateFrom?: Date | null;
  dateTo?: Date | null;
  assigneeId?: string;
  hasAttachments?: boolean;
}

interface AdvancedFiltersProps {
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  teamMembers?: Array<{ id: string; full_name: string | null; email: string }>;
  className?: string;
}

const STATUS_OPTIONS: { value: RequestStatus; label: string }[] = [
  { value: 'queue', label: 'Queue' },
  { value: 'active', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Complete' },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
];

export function AdvancedFilters({
  filters,
  onFiltersChange,
  teamMembers = [],
  className,
}: AdvancedFiltersProps) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterValues>(filters);

  const hasActiveFilters =
    (filters.status?.length ?? 0) > 0 ||
    (filters.priority?.length ?? 0) > 0 ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.assigneeId;

  const handleOpen = () => {
    setLocalFilters(filters);
    setOpen(true);
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    setOpen(false);
  };

  const handleClear = () => {
    const emptyFilters: FilterValues = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
    setOpen(false);
  };

  const toggleStatus = (status: RequestStatus) => {
    const currentStatuses = localFilters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];
    setLocalFilters({ ...localFilters, status: newStatuses.length > 0 ? newStatuses : undefined });
  };

  const togglePriority = (priority: Priority) => {
    const currentPriorities = localFilters.priority || [];
    const newPriorities = currentPriorities.includes(priority)
      ? currentPriorities.filter((p) => p !== priority)
      : [...currentPriorities, priority];
    setLocalFilters({ ...localFilters, priority: newPriorities.length > 0 ? newPriorities : undefined });
  };

  return (
    <>
      <Button
        variant={hasActiveFilters ? 'default' : 'outline'}
        size="sm"
        onClick={handleOpen}
        className={className}
      >
        <Filter className="h-4 w-4 mr-2" />
        Filters
        {hasActiveFilters && (
          <span className="ml-2 rounded-full bg-primary-foreground px-2 py-0.5 text-xs text-primary">
            Active
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Filter Requests</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={localFilters.status?.includes(option.value) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleStatus(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    variant={localFilters.priority?.includes(option.value) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => togglePriority(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Due Date Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <DueDatePicker
                  value={localFilters.dateFrom || null}
                  onChange={(date) => setLocalFilters({ ...localFilters, dateFrom: date })}
                  placeholder="From"
                />
                <DueDatePicker
                  value={localFilters.dateTo || null}
                  onChange={(date) => setLocalFilters({ ...localFilters, dateTo: date })}
                  placeholder="To"
                />
              </div>
            </div>

            {/* Assignee */}
            {teamMembers.length > 0 && (
              <div className="space-y-2">
                <Label>Assignee</Label>
                <select
                  value={localFilters.assigneeId || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      assigneeId: e.target.value || undefined,
                    })
                  }
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">All assignees</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClear}>
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
            <Button onClick={handleApply}>Apply Filters</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
