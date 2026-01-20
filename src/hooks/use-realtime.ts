'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Create a singleton Supabase client for realtime
const getSupabaseClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface UseRealtimeOptions<T> {
  table: string;
  schema?: string;
  event?: RealtimeEvent;
  filter?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: { old: T; new: T }) => void;
  onDelete?: (payload: T) => void;
  enabled?: boolean;
}

/**
 * Hook to subscribe to real-time database changes
 */
export function useRealtime<T extends Record<string, unknown>>({
  table,
  schema = 'public',
  event = '*',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseRealtimeOptions<T>) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<T>) => {
      switch (payload.eventType) {
        case 'INSERT':
          onInsert?.(payload.new as T);
          break;
        case 'UPDATE':
          onUpdate?.({ old: payload.old as T, new: payload.new as T });
          break;
        case 'DELETE':
          onDelete?.(payload.old as T);
          break;
      }
    },
    [onInsert, onUpdate, onDelete]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const supabase = getSupabaseClient();

    // Create channel name
    const channelName = `${table}-${filter || 'all'}-${Date.now()}`;

    // Build the subscription config
    const subscriptionConfig: {
      event: RealtimeEvent;
      schema: string;
      table: string;
      filter?: string;
    } = {
      event,
      schema,
      table,
    };

    if (filter) {
      subscriptionConfig.filter = filter;
    }

    // Subscribe to changes
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        subscriptionConfig,
        handleChange
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setError(new Error('Failed to connect to realtime channel'));
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, schema, event, filter, handleChange, enabled]);

  return { isConnected, error };
}

/**
 * Hook to subscribe to request changes for a specific company
 */
export function useRequestsRealtime(
  companyId: string | null,
  callbacks: {
    onInsert?: (request: Record<string, unknown>) => void;
    onUpdate?: (data: { old: Record<string, unknown>; new: Record<string, unknown> }) => void;
    onDelete?: (request: Record<string, unknown>) => void;
  }
) {
  return useRealtime({
    table: 'requests',
    filter: companyId ? `company_id=eq.${companyId}` : undefined,
    ...callbacks,
    enabled: !!companyId,
  });
}

/**
 * Hook to subscribe to notification changes for a specific user
 */
export function useNotificationsRealtime(
  userId: string | null,
  onNewNotification: (notification: Record<string, unknown>) => void
) {
  return useRealtime({
    table: 'notifications',
    event: 'INSERT',
    filter: userId ? `user_id=eq.${userId}` : undefined,
    onInsert: onNewNotification,
    enabled: !!userId,
  });
}

/**
 * Hook to subscribe to comment changes for a specific request
 */
export function useCommentsRealtime(
  requestId: string | null,
  callbacks: {
    onInsert?: (comment: Record<string, unknown>) => void;
    onUpdate?: (data: { old: Record<string, unknown>; new: Record<string, unknown> }) => void;
    onDelete?: (comment: Record<string, unknown>) => void;
  }
) {
  return useRealtime({
    table: 'comments',
    filter: requestId ? `request_id=eq.${requestId}` : undefined,
    ...callbacks,
    enabled: !!requestId,
  });
}

/**
 * Hook to track presence (who's online)
 */
export function usePresence(roomId: string, userId: string) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [presentUsers, setPresentUsers] = useState<Map<string, Record<string, unknown>>>(new Map());

  useEffect(() => {
    const supabase = getSupabaseClient();

    const channel = supabase.channel(`presence-${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = new Map<string, Record<string, unknown>>();

        Object.entries(state).forEach(([key, presences]) => {
          if (Array.isArray(presences) && presences.length > 0) {
            users.set(key, presences[0] as Record<string, unknown>);
          }
        });

        setPresentUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (newPresences && newPresences.length > 0) {
          setPresentUsers(prev => new Map(prev).set(key, newPresences[0] as Record<string, unknown>));
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setPresentUsers(prev => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomId, userId]);

  return { presentUsers: Array.from(presentUsers.values()) };
}
