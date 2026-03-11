'use client';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Separator } from '@/shared/components/ui/separator';
import { ExternalLink } from 'lucide-react';
import type { ResearchItemWithTags } from '../types';

interface ResearchDetailDialogProps {
  item: ResearchItemWithTags | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResearchDetailDialog({ item, open, onOpenChange }: ResearchDetailDialogProps) {
  if (!item) return null;

  const authors = item.authors ? (() => {
    try {
      return JSON.parse(item.authors) as string[];
    } catch {
      return [];
    }
  })() : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge>
              {item.sourceType}
            </Badge>
            {item.reliabilityTier && (
              <Badge variant="outline">
                {item.reliabilityTier.replace('_', ' ')}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-lg">{item.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {item.url && (
            <div>
              <Button
                variant="link"
                className="h-auto p-0 text-sm"
                onClick={() => window.open(item.url!, '_blank')}
              >
                <ExternalLink className="mr-1 size-3" />
                {item.url}
              </Button>
            </div>
          )}

          {authors.length > 0 && (
            <div>
              <h4 className="mb-1 text-sm font-medium">Authors</h4>
              <p className="text-sm text-muted-foreground">{authors.join(', ')}</p>
            </div>
          )}

          {item.publishedDate && (
            <div>
              <h4 className="mb-1 text-sm font-medium">Published</h4>
              <p className="text-sm text-muted-foreground">{item.publishedDate}</p>
            </div>
          )}

          {item.tags && item.tags.length > 0 && (
            <div>
              <h4 className="mb-1 text-sm font-medium">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {item.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {item.summary && (
            <>
              <Separator />
              <div>
                <h4 className="mb-2 text-sm font-medium">Summary</h4>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {item.summary}
                </p>
              </div>
            </>
          )}

          {item.content && (
            <>
              <Separator />
              <div>
                <h4 className="mb-2 text-sm font-medium">Content</h4>
                <div className="max-h-60 overflow-y-auto rounded-md border p-3">
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                    {item.content.slice(0, 3000)}
                    {item.content.length > 3000 && '...'}
                  </p>
                </div>
              </div>
            </>
          )}

          <p className="text-xs text-muted-foreground">
            Added {new Date(item.createdAt).toLocaleString()}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
