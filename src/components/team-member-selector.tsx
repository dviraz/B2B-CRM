'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
}

interface TeamMemberSelectorProps {
  teamMembers: TeamMember[];
  selectedId?: string | null;
  onSelect: (memberId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TeamMemberSelector({
  teamMembers,
  selectedId,
  onSelect,
  placeholder = 'Assign to...',
  disabled = false,
  className,
}: TeamMemberSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedMember = teamMembers.find((m) => m.id === selectedId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('justify-between', className)}
        >
          {selectedMember ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-xs">
                  {selectedMember.full_name?.[0] || selectedMember.email[0]}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {selectedMember.full_name || selectedMember.email}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search team members..." />
          <CommandList>
            <CommandEmpty>No team member found.</CommandEmpty>
            <CommandGroup>
              {selectedId && (
                <CommandItem
                  value="__unassign__"
                  onSelect={() => {
                    onSelect(null);
                    setOpen(false);
                  }}
                  className="text-muted-foreground"
                >
                  <X className="mr-2 h-4 w-4" />
                  Unassign
                </CommandItem>
              )}
              {teamMembers.map((member) => (
                <CommandItem
                  key={member.id}
                  value={member.full_name || member.email}
                  onSelect={() => {
                    onSelect(member.id);
                    setOpen(false);
                  }}
                >
                  <Avatar className="mr-2 h-5 w-5">
                    <AvatarFallback className="text-xs">
                      {member.full_name?.[0] || member.email[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate">
                    {member.full_name || member.email}
                  </span>
                  <Check
                    className={cn(
                      'ml-2 h-4 w-4',
                      selectedId === member.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface MultiTeamMemberSelectorProps {
  teamMembers: TeamMember[];
  selectedIds: string[];
  onSelectionChange: (memberIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxSelections?: number;
}

export function MultiTeamMemberSelector({
  teamMembers,
  selectedIds,
  onSelectionChange,
  placeholder = 'Assign team members...',
  disabled = false,
  className,
  maxSelections,
}: MultiTeamMemberSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedMembers = teamMembers.filter((m) => selectedIds.includes(m.id));
  const canAddMore = !maxSelections || selectedIds.length < maxSelections;

  const toggleMember = (memberId: string) => {
    if (selectedIds.includes(memberId)) {
      onSelectionChange(selectedIds.filter((id) => id !== memberId));
    } else if (canAddMore) {
      onSelectionChange([...selectedIds, memberId]);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedMembers.map((member) => (
            <Badge
              key={member.id}
              variant="secondary"
              className="flex items-center gap-1"
            >
              <Avatar className="h-4 w-4">
                <AvatarFallback className="text-[10px]">
                  {member.full_name?.[0] || member.email[0]}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[100px] truncate">
                {member.full_name || member.email}
              </span>
              <button
                type="button"
                onClick={() => toggleMember(member.id)}
                className="ml-1 rounded-full hover:bg-muted-foreground/20"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || !canAddMore}
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {selectedIds.length === 0
                  ? placeholder
                  : `Add another (${selectedIds.length}${maxSelections ? `/${maxSelections}` : ''})`}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search team members..." />
            <CommandList>
              <CommandEmpty>No team member found.</CommandEmpty>
              <CommandGroup>
                {teamMembers.map((member) => {
                  const isSelected = selectedIds.includes(member.id);
                  return (
                    <CommandItem
                      key={member.id}
                      value={member.full_name || member.email}
                      onSelect={() => toggleMember(member.id)}
                      disabled={!isSelected && !canAddMore}
                    >
                      <Avatar className="mr-2 h-5 w-5">
                        <AvatarFallback className="text-xs">
                          {member.full_name?.[0] || member.email[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">
                        {member.full_name || member.email}
                      </span>
                      <Check
                        className={cn(
                          'ml-2 h-4 w-4',
                          isSelected ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
