'use client';

import { useState } from 'react';
import { Bookmark, Star, Trash2, Plus, Check } from 'lucide-react';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSavedFilters, SavedFilter } from '@/hooks/use-saved-filters';
import { toast } from 'sonner';

interface SavedFiltersProps {
  filterType: string;
  currentFilters: Record<string, unknown>;
  onApplyFilter: (filters: Record<string, unknown>) => void;
}

export function SavedFilters({
  filterType,
  currentFilters,
  onApplyFilter,
}: SavedFiltersProps) {
  const {
    savedFilters,
    saveFilter,
    deleteFilter,
    setDefaultFilter,
    getDefaultFilter,
  } = useSavedFilters(filterType);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState('');

  const handleSaveFilter = () => {
    if (!filterName.trim()) {
      toast.error('Please enter a filter name');
      return;
    }

    // Check if there are any active filters
    const hasActiveFilters = Object.values(currentFilters).some(
      value => value !== undefined && value !== null && value !== ''
    );

    if (!hasActiveFilters) {
      toast.error('No active filters to save');
      return;
    }

    saveFilter(filterName.trim(), currentFilters);
    toast.success('Filter saved successfully');
    setIsDialogOpen(false);
    setFilterName('');
  };

  const handleApplyFilter = (filter: SavedFilter) => {
    onApplyFilter(filter.filters);
    toast.success(`Applied filter: ${filter.name}`);
  };

  const handleDeleteFilter = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteFilter(id);
    toast.success('Filter deleted');
  };

  const handleSetDefault = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const defaultFilter = getDefaultFilter();
    setDefaultFilter(defaultFilter?.id === id ? null : id);
    toast.success(
      defaultFilter?.id === id
        ? 'Default filter removed'
        : 'Default filter set'
    );
  };

  const defaultFilter = getDefaultFilter();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Bookmark className="h-4 w-4" />
            Saved Filters
            {savedFilters.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                {savedFilters.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {savedFilters.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No saved filters yet
            </div>
          ) : (
            savedFilters.map(filter => (
              <DropdownMenuItem
                key={filter.id}
                className="flex items-center justify-between cursor-pointer"
                onClick={() => handleApplyFilter(filter)}
              >
                <div className="flex items-center gap-2">
                  {filter.isDefault && (
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  )}
                  <span>{filter.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => handleSetDefault(e, filter.id)}
                    title={filter.isDefault ? 'Remove default' : 'Set as default'}
                  >
                    <Star
                      className={`h-3 w-3 ${
                        filter.isDefault
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={(e) => handleDeleteFilter(e, filter.id)}
                    title="Delete filter"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Save Current Filter
          </DropdownMenuItem>
          {defaultFilter && (
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => handleApplyFilter(defaultFilter)}
            >
              <Check className="mr-2 h-4 w-4" />
              Apply Default Filter
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filterName">Filter Name</Label>
              <Input
                id="filterName"
                placeholder="e.g., High Priority Active"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveFilter();
                  }
                }}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Current filters that will be saved:</p>
              <ul className="mt-2 space-y-1">
                {Object.entries(currentFilters)
                  .filter(([, value]) => value !== undefined && value !== null && value !== '')
                  .map(([key, value]) => (
                    <li key={key} className="flex items-center gap-2">
                      <span className="font-medium">{key}:</span>
                      <span>{String(value)}</span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFilter}>Save Filter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
