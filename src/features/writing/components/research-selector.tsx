'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { ChevronDown, ChevronUp, CheckSquare, Square } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useResearchItems } from '@/features/research/hooks';

interface ResearchSelectorProps {
  projectId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function ResearchSelector({
  projectId,
  selectedIds,
  onChange,
  disabled,
}: ResearchSelectorProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: items = [] } = useResearchItems({ projectId });

  function toggleItem(id: string) {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function selectAll() {
    if (disabled) return;
    onChange(items.map((i) => i.id));
  }

  function deselectAll() {
    if (disabled) return;
    onChange([]);
  }

  const SOURCE_LABELS: Record<string, string> = {
    web: 'Web',
    url: 'URL',
    academic: 'Academic',
  };

  return (
    <div className="rounded-lg border border-input">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium"
      >
        <span>
          Research Items{' '}
          <span className="text-muted-foreground">
            ({selectedIds.length}/{items.length} selected)
          </span>
        </span>
        {expanded ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-input px-3 py-2">
          <div className="mb-2 flex gap-2">
            <Button
              variant="ghost"
              size="xs"
              onClick={selectAll}
              disabled={disabled}
            >
              Select all
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={deselectAll}
              disabled={disabled}
            >
              Deselect all
            </Button>
          </div>

          <div className="max-h-48 space-y-1 overflow-y-auto">
            {items.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  disabled={disabled}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
                    isSelected ? 'bg-primary/10' : 'hover:bg-muted/50',
                    disabled && 'cursor-not-allowed opacity-60',
                  )}
                >
                  {isSelected ? (
                    <CheckSquare className="size-4 shrink-0 text-primary" />
                  ) : (
                    <Square className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex-1 truncate">{item.title}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {SOURCE_LABELS[item.sourceType] || item.sourceType}
                  </Badge>
                </button>
              );
            })}

            {items.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No research items in this project
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
