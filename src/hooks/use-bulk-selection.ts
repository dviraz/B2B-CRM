'use client';

import { useState, useCallback, useMemo } from 'react';

export function useBulkSelection<T extends { id: string }>() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback((items: T[]) => {
    setSelectedIds(new Set(items.map((item) => item.id)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => {
      if (prev) {
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

  const getSelectedItems = useCallback(
    (items: T[]) => items.filter((item) => selectedIds.has(item.id)),
    [selectedIds]
  );

  return {
    selectedIds: Array.from(selectedIds),
    selectedCount,
    isSelectionMode,
    toggleSelection,
    selectAll,
    clearSelection,
    toggleSelectionMode,
    isSelected,
    getSelectedItems,
  };
}
