'use client';

import { useState } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Search, Library } from 'lucide-react';
import { useResearchItems, useDeleteResearchItem } from '../hooks';
import { ResearchCard } from './research-card';
import { ResearchDetailDialog } from './research-detail-dialog';
import type { ResearchItemWithTags } from '../types';

interface ResearchLibraryProps {
  projectId: string;
}

type SourceFilter = 'all' | 'web' | 'url' | 'academic';

export function ResearchLibrary({ projectId }: ResearchLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [selectedItem, setSelectedItem] = useState<ResearchItemWithTags | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: items, isLoading, error } = useResearchItems({
    projectId,
    sourceType: sourceFilter !== 'all' ? sourceFilter : undefined,
    search: searchQuery || undefined,
  });

  const deleteItem = useDeleteResearchItem();

  function handleView(item: ResearchItemWithTags) {
    setSelectedItem(item);
    setDetailOpen(true);
  }

  function handleDelete(id: string) {
    deleteItem.mutate(id);
  }

  const sourceFilters: { value: SourceFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'web', label: 'Web' },
    { value: 'url', label: 'URL' },
    { value: 'academic', label: 'Academic' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Library className="size-4" />
          Research Library
        </h3>
        {items && (
          <span className="text-xs text-muted-foreground">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter research..."
            className="pl-8 text-sm"
          />
        </div>
        <div className="flex gap-1">
          {sourceFilters.map((filter) => (
            <Button
              key={filter.value}
              variant={sourceFilter === filter.value ? 'default' : 'outline'}
              size="sm"
              className="text-xs"
              onClick={() => setSourceFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">Failed to load research items.</p>
      )}

      {items && items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8">
          <Library className="mb-2 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No research items yet
          </p>
          <p className="text-xs text-muted-foreground">
            Use the search panel above to find and save research.
          </p>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <ResearchCard
              key={item.id}
              item={item}
              onView={handleView}
              onDelete={handleDelete}
              isDeleting={deleteItem.isPending}
            />
          ))}
        </div>
      )}

      <ResearchDetailDialog
        item={selectedItem}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
