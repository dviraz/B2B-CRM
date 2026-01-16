'use client';

import { useState, useEffect } from 'react';
import { History, Loader2 } from 'lucide-react';
import { ActivityItem } from '@/components/activity-item';
import type { Activity } from '@/types';

interface ActivityTimelineProps {
  requestId: string;
}

export function ActivityTimeline({ requestId }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/requests/${requestId}/activities`);
        if (response.ok) {
          const data = await response.json();
          setActivities(data);
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [requestId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="pt-2">
      {activities.map((activity, index) => (
        <ActivityItem
          key={activity.id}
          activity={activity}
          isLast={index === activities.length - 1}
        />
      ))}
    </div>
  );
}
