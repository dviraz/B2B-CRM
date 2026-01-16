'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Assignee {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
}

interface AssignmentAvatarsProps {
  assignees: Assignee[];
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

const sizeClasses = {
  sm: 'h-5 w-5 text-[10px]',
  md: 'h-6 w-6 text-xs',
  lg: 'h-8 w-8 text-sm',
};

const offsetClasses = {
  sm: '-ml-1.5',
  md: '-ml-2',
  lg: '-ml-2.5',
};

export function AssignmentAvatars({
  assignees,
  maxDisplay = 3,
  size = 'md',
  className,
  showTooltip = true,
}: AssignmentAvatarsProps) {
  if (assignees.length === 0) {
    return null;
  }

  const displayedAssignees = assignees.slice(0, maxDisplay);
  const remainingCount = assignees.length - maxDisplay;

  const getInitial = (assignee: Assignee) => {
    return assignee.full_name?.[0]?.toUpperCase() || assignee.email[0].toUpperCase();
  };

  const getName = (assignee: Assignee) => {
    return assignee.full_name || assignee.email;
  };

  const avatarContent = (
    <div className={cn('flex items-center', className)}>
      {displayedAssignees.map((assignee, index) => (
        <Avatar
          key={assignee.id}
          className={cn(
            sizeClasses[size],
            index > 0 && offsetClasses[size],
            'border-2 border-background ring-0'
          )}
        >
          {assignee.avatar_url && <AvatarImage src={assignee.avatar_url} />}
          <AvatarFallback className={cn(sizeClasses[size], 'font-medium')}>
            {getInitial(assignee)}
          </AvatarFallback>
        </Avatar>
      ))}
      {remainingCount > 0 && (
        <Avatar
          className={cn(
            sizeClasses[size],
            offsetClasses[size],
            'border-2 border-background bg-muted'
          )}
        >
          <AvatarFallback className={cn(sizeClasses[size], 'font-medium')}>
            +{remainingCount}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );

  if (!showTooltip) {
    return avatarContent;
  }

  const tooltipText = assignees.map(getName).join(', ');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{avatarContent}</TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Assigned to: {tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface SingleAssigneeAvatarProps {
  assignee: Assignee | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
  showName?: boolean;
}

export function SingleAssigneeAvatar({
  assignee,
  size = 'md',
  className,
  showTooltip = true,
  showName = false,
}: SingleAssigneeAvatarProps) {
  if (!assignee) {
    return null;
  }

  const initial = assignee.full_name?.[0]?.toUpperCase() || assignee.email[0].toUpperCase();
  const name = assignee.full_name || assignee.email;

  const content = (
    <div className={cn('flex items-center gap-2', className)}>
      <Avatar className={cn(sizeClasses[size], 'border-2 border-background')}>
        {assignee.avatar_url && <AvatarImage src={assignee.avatar_url} />}
        <AvatarFallback className={cn(sizeClasses[size], 'font-medium')}>
          {initial}
        </AvatarFallback>
      </Avatar>
      {showName && <span className="text-sm truncate">{name}</span>}
    </div>
  );

  if (!showTooltip || showName) {
    return content;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{name}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
