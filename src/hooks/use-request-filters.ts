'use client';

import { useState, useCallback, useMemo } from 'react';
import type { FilterValues } from '@/components/advanced-filters';

export function useRequestFilters() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterValues>({});

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();

    if (searchQuery) {
      params.set('q', searchQuery);
    }

    if (filters.status && filters.status.length > 0) {
      params.set('status', filters.status.join(','));
    }

    if (filters.priority && filters.priority.length > 0) {
      params.set('priority', filters.priority.join(','));
    }

    if (filters.assigneeId) {
      params.set('assignee', filters.assigneeId);
    }

    if (filters.dateFrom) {
      params.set('date_from', filters.dateFrom.toISOString());
    }

    if (filters.dateTo) {
      params.set('date_to', filters.dateTo.toISOString());
    }

    return params.toString();
  }, [searchQuery, filters]);

  const removeFilter = useCallback((key: keyof FilterValues, value?: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };

      if (key === 'status' && value) {
        newFilters.status = prev.status?.filter((s) => s !== value);
        if (newFilters.status?.length === 0) delete newFilters.status;
      } else if (key === 'priority' && value) {
        newFilters.priority = prev.priority?.filter((p) => p !== value);
        if (newFilters.priority?.length === 0) delete newFilters.priority;
      } else {
        delete newFilters[key];
      }

      return newFilters;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery.length > 0 ||
      (filters.status?.length ?? 0) > 0 ||
      (filters.priority?.length ?? 0) > 0 ||
      !!filters.dateFrom ||
      !!filters.dateTo ||
      !!filters.assigneeId
    );
  }, [searchQuery, filters]);

  return {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    buildQueryParams,
    removeFilter,
    clearAllFilters,
    hasActiveFilters,
  };
}
