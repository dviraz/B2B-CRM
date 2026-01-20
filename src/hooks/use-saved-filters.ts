'use client';

import { useState, useEffect, useCallback } from 'react';

export interface SavedFilter {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  createdAt: string;
  isDefault?: boolean;
}

const STORAGE_KEY = 'agencyos-saved-filters';

/**
 * Hook to manage saved filters with localStorage persistence
 */
export function useSavedFilters(filterType: string) {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load filters from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}-${filterType}`);
      if (stored) {
        setSavedFilters(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
    setIsLoading(false);
  }, [filterType]);

  // Save filters to localStorage when they change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(
          `${STORAGE_KEY}-${filterType}`,
          JSON.stringify(savedFilters)
        );
      } catch (error) {
        console.error('Error saving filters:', error);
      }
    }
  }, [savedFilters, filterType, isLoading]);

  const saveFilter = useCallback((name: string, filters: Record<string, unknown>) => {
    const newFilter: SavedFilter = {
      id: crypto.randomUUID(),
      name,
      filters,
      createdAt: new Date().toISOString(),
    };
    setSavedFilters(prev => [...prev, newFilter]);
    return newFilter;
  }, []);

  const updateFilter = useCallback((id: string, updates: Partial<SavedFilter>) => {
    setSavedFilters(prev =>
      prev.map(filter =>
        filter.id === id ? { ...filter, ...updates } : filter
      )
    );
  }, []);

  const deleteFilter = useCallback((id: string) => {
    setSavedFilters(prev => prev.filter(filter => filter.id !== id));
  }, []);

  const setDefaultFilter = useCallback((id: string | null) => {
    setSavedFilters(prev =>
      prev.map(filter => ({
        ...filter,
        isDefault: filter.id === id,
      }))
    );
  }, []);

  const getDefaultFilter = useCallback(() => {
    return savedFilters.find(filter => filter.isDefault);
  }, [savedFilters]);

  const getFilterById = useCallback((id: string) => {
    return savedFilters.find(filter => filter.id === id);
  }, [savedFilters]);

  return {
    savedFilters,
    isLoading,
    saveFilter,
    updateFilter,
    deleteFilter,
    setDefaultFilter,
    getDefaultFilter,
    getFilterById,
  };
}

/**
 * Component for managing saved filters
 */
export interface FilterManagerProps {
  filterType: string;
  currentFilters: Record<string, unknown>;
  onApplyFilter: (filters: Record<string, unknown>) => void;
}
