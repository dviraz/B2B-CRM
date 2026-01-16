'use client';

import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  GitBranch,
  UserPlus,
  AtSign,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import type { Notification, NotificationType } from '@/types';

interface NotificationItemProps {
  notification: Notification;
  onClick?: () => void;
  onMarkAsRead?: () => void;
}

const iconMap: Record<NotificationType, React.ReactNode> = {
  comment: <MessageSquare className="h-4 w-4" />,
  status_change: <GitBranch className="h-4 w-4" />,
  assignment: <UserPlus className="h-4 w-4" />,
  mention: <AtSign className="h-4 w-4" />,
  due_date: <Clock className="h-4 w-4" />,
  sla_breach: <AlertTriangle className="h-4 w-4" />,
};

const colorMap: Record<NotificationType, string> = {
  comment: 'bg-blue-100 text-blue-600',
  status_change: 'bg-green-100 text-green-600',
  assignment: 'bg-purple-100 text-purple-600',
  mention: 'bg-yellow-100 text-yellow-600',
  due_date: 'bg-orange-100 text-orange-600',
  sla_breach: 'bg-red-100 text-red-600',
};

export function NotificationItem({
  notification,
  onClick,
  onMarkAsRead,
}: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.is_read && onMarkAsRead) {
      onMarkAsRead();
    }
    onClick?.();
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors',
        !notification.is_read && 'bg-blue-50/50'
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          colorMap[notification.type]
        )}
      >
        {iconMap[notification.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm',
            !notification.is_read ? 'font-medium' : 'text-muted-foreground'
          )}
        >
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
          })}
        </p>
      </div>
      {!notification.is_read && (
        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />
      )}
    </div>
  );
}
