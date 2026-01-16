'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  PlusCircle,
  GitBranch,
  Star,
  Calendar,
  MessageSquare,
  UserPlus,
  Paperclip,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Activity, ActivityType } from '@/types';

interface ActivityItemProps {
  activity: Activity;
  isLast?: boolean;
}

const iconMap: Record<ActivityType, React.ReactNode> = {
  created: <PlusCircle className="h-4 w-4" />,
  status_change: <GitBranch className="h-4 w-4" />,
  priority_change: <Star className="h-4 w-4" />,
  due_date_change: <Calendar className="h-4 w-4" />,
  comment: <MessageSquare className="h-4 w-4" />,
  assignment: <UserPlus className="h-4 w-4" />,
  file_upload: <Paperclip className="h-4 w-4" />,
};

const colorMap: Record<ActivityType, string> = {
  created: 'bg-green-100 text-green-600 border-green-200',
  status_change: 'bg-blue-100 text-blue-600 border-blue-200',
  priority_change: 'bg-yellow-100 text-yellow-600 border-yellow-200',
  due_date_change: 'bg-orange-100 text-orange-600 border-orange-200',
  comment: 'bg-purple-100 text-purple-600 border-purple-200',
  assignment: 'bg-indigo-100 text-indigo-600 border-indigo-200',
  file_upload: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function ActivityItem({ activity, isLast = false }: ActivityItemProps) {
  const userName = activity.user?.full_name || activity.user?.email || 'System';
  const initial = userName[0].toUpperCase();

  return (
    <div className="relative pl-8 pb-6">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border" />
      )}

      {/* Icon */}
      <div
        className={cn(
          'absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border-2',
          colorMap[activity.activity_type]
        )}
      >
        {iconMap[activity.activity_type]}
      </div>

      {/* Content */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm">
            <span className="font-medium">{userName}</span>{' '}
            <span className="text-muted-foreground">
              {activity.description}
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(activity.created_at), {
              addSuffix: true,
            })}
          </p>

          {/* Show metadata if available */}
          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
            <div className="mt-2 text-xs bg-muted/50 rounded p-2">
              {activity.activity_type === 'status_change' && (
                <span>
                  Changed from{' '}
                  <span className="font-medium">
                    {activity.metadata.old_status as string}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {activity.metadata.new_status as string}
                  </span>
                </span>
              )}
              {activity.activity_type === 'priority_change' && (
                <span>
                  Changed from{' '}
                  <span className="font-medium">
                    {activity.metadata.old_priority as string}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {activity.metadata.new_priority as string}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>
        <Avatar className="h-6 w-6 flex-shrink-0">
          <AvatarFallback className="text-xs">{initial}</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
