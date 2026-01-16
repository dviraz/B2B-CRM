'use client';

import { useMemo } from 'react';
import { Clock, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow, differenceInHours, isPast, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SLAStatus } from '@/types';

interface SLAIndicatorProps {
  dueDate: string | null;
  slaStatus?: SLAStatus | null;
  completedAt?: string | null;
  showDetails?: boolean;
  className?: string;
}

const slaColors: Record<string, string> = {
  on_track: 'bg-green-100 text-green-700 border-green-200',
  at_risk: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  breached: 'bg-red-100 text-red-700 border-red-200',
  completed: 'bg-blue-100 text-blue-700 border-blue-200',
};

const slaIcons: Record<string, typeof Clock> = {
  on_track: CheckCircle,
  at_risk: AlertTriangle,
  breached: XCircle,
  completed: CheckCircle,
};

export function SLAIndicator({
  dueDate,
  slaStatus,
  completedAt,
  showDetails = false,
  className,
}: SLAIndicatorProps) {
  const { status, label, icon: Icon, timeInfo } = useMemo(() => {
    if (!dueDate) {
      return { status: null, label: null, icon: null, timeInfo: null };
    }

    const due = new Date(dueDate);
    const now = new Date();

    // If completed
    if (completedAt) {
      const completed = new Date(completedAt);
      const wasLate = completed > due;
      return {
        status: wasLate ? 'breached' : 'completed',
        label: wasLate ? 'Completed Late' : 'Completed',
        icon: wasLate ? XCircle : CheckCircle,
        timeInfo: `Completed ${format(completed, 'MMM d')}`,
      };
    }

    // Calculate time remaining
    const hoursRemaining = differenceInHours(due, now);
    const isOverdue = isPast(due);

    let calculatedStatus: string;
    let calculatedLabel: string;

    if (isOverdue) {
      calculatedStatus = 'breached';
      calculatedLabel = 'Overdue';
    } else if (hoursRemaining <= 4) {
      calculatedStatus = 'at_risk';
      calculatedLabel = 'At Risk';
    } else if (hoursRemaining <= 24) {
      calculatedStatus = 'at_risk';
      calculatedLabel = 'Due Soon';
    } else {
      calculatedStatus = 'on_track';
      calculatedLabel = 'On Track';
    }

    // Use provided SLA status if available, otherwise calculated
    const finalStatus = slaStatus || calculatedStatus;
    const finalLabel = slaStatus ? (
      slaStatus === 'on_track' ? 'On Track' :
      slaStatus === 'at_risk' ? 'At Risk' :
      'Breached'
    ) : calculatedLabel;

    const timeText = isOverdue
      ? `Overdue by ${formatDistanceToNow(due)}`
      : `Due ${formatDistanceToNow(due, { addSuffix: true })}`;

    return {
      status: finalStatus,
      label: finalLabel,
      icon: slaIcons[finalStatus] || Clock,
      timeInfo: timeText,
    };
  }, [dueDate, slaStatus, completedAt]);

  if (!status) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-normal',
        slaColors[status],
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {showDetails ? (
        <span>{timeInfo}</span>
      ) : (
        <span>{label}</span>
      )}
    </Badge>
  );
}

interface DueDateBadgeProps {
  dueDate: string | null;
  completedAt?: string | null;
  className?: string;
}

export function DueDateBadge({
  dueDate,
  completedAt,
  className,
}: DueDateBadgeProps) {
  if (!dueDate) return null;

  const due = new Date(dueDate);
  const now = new Date();
  const isOverdue = isPast(due) && !completedAt;
  const isDueSoon = !isOverdue && differenceInHours(due, now) <= 24;

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-normal text-xs',
        isOverdue && 'bg-red-100 text-red-700 border-red-200',
        isDueSoon && !isOverdue && 'bg-yellow-100 text-yellow-700 border-yellow-200',
        !isOverdue && !isDueSoon && 'bg-slate-100 text-slate-600 border-slate-200',
        className
      )}
    >
      <Clock className="h-3 w-3" />
      {format(due, 'MMM d')}
    </Badge>
  );
}
