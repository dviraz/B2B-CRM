'use client';

import { useState, useEffect } from 'react';
import { FileText, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { RequestTemplate, Priority } from '@/types';

interface TemplateSelectorProps {
  onSelect: (template: RequestTemplate) => void;
  disabled?: boolean;
}

const priorityLabels: Record<Priority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
};

export function TemplateSelector({ onSelect, disabled = false }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<RequestTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/templates');
        if (response.ok) {
          const data = await response.json();
          setTemplates(data);
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  if (isLoading) {
    return (
      <Button variant="outline" disabled size="sm">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Loading templates...
      </Button>
    );
  }

  if (templates.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <FileText className="h-4 w-4 mr-2" />
          Use Template
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {templates.map((template) => (
          <DropdownMenuItem
            key={template.id}
            onClick={() => onSelect(template)}
            className="flex flex-col items-start py-2"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{template.name}</span>
              <Badge variant="outline" className="text-xs">
                {priorityLabels[template.default_priority]}
              </Badge>
            </div>
            {template.description && (
              <span className="text-xs text-muted-foreground mt-0.5">
                {template.description}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
