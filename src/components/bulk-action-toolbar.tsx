'use client';

import { useState } from 'react';
import { CheckSquare, XSquare, Trash2, ArrowRight, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { RequestStatus, Priority } from '@/types';

interface BulkActionToolbarProps {
  selectedCount: number;
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
  onClearSelection: () => void;
  onBulkStatusChange: (status: RequestStatus) => Promise<void>;
  onBulkPriorityChange: (priority: Priority) => Promise<void>;
  onBulkAssign?: (userId: string) => Promise<void>;
  onBulkDelete: () => Promise<void>;
  teamMembers?: Array<{ id: string; full_name: string | null; email: string }>;
}

export function BulkActionToolbar({
  selectedCount,
  isSelectionMode,
  onToggleSelectionMode,
  onClearSelection,
  onBulkStatusChange,
  onBulkPriorityChange,
  onBulkAssign,
  onBulkDelete,
  teamMembers = [],
}: BulkActionToolbarProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onBulkDelete();
      setShowDeleteConfirm(false);
      onClearSelection();
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isSelectionMode) {
    return (
      <Button variant="outline" size="sm" onClick={onToggleSelectionMode}>
        <CheckSquare className="h-4 w-4 mr-2" />
        Select
      </Button>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 bg-muted p-2 rounded-lg">
        <Button variant="ghost" size="sm" onClick={onToggleSelectionMode}>
          <XSquare className="h-4 w-4 mr-2" />
          Cancel
        </Button>

        <div className="text-sm font-medium px-2">
          {selectedCount} selected
        </div>

        {selectedCount > 0 && (
          <>
            {/* Status dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Move to
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onBulkStatusChange('queue')}>
                  Queue
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onBulkStatusChange('active')}>
                  In Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onBulkStatusChange('review')}>
                  Review
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onBulkStatusChange('done')}>
                  Complete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Priority dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Priority
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onBulkPriorityChange('high')}>
                  High
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onBulkPriorityChange('normal')}>
                  Normal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onBulkPriorityChange('low')}>
                  Low
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Assign dropdown */}
            {onBulkAssign && teamMembers.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {teamMembers.map((member) => (
                    <DropdownMenuItem
                      key={member.id}
                      onClick={() => onBulkAssign(member.id)}
                    >
                      {member.full_name || member.email}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DropdownMenuSeparator className="h-6 w-px bg-border mx-1" />

            {/* Delete button */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedCount} requests?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All selected requests will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
