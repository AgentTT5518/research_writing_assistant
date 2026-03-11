'use client';

import { Card, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ExternalLink, Trash2, Eye } from 'lucide-react';
import type { ResearchItemWithTags } from '../types';

const SOURCE_LABELS: Record<string, string> = {
  web: 'Web',
  url: 'URL',
  academic: 'Academic',
};

const SOURCE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  web: 'default',
  url: 'secondary',
  academic: 'outline',
};

interface ResearchCardProps {
  item: ResearchItemWithTags;
  onView: (item: ResearchItemWithTags) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function ResearchCard({ item, onView, onDelete, isDeleting }: ResearchCardProps) {
  return (
    <Card className="transition-colors hover:bg-muted/50">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Badge variant={SOURCE_VARIANTS[item.sourceType] || 'default'}>
                {SOURCE_LABELS[item.sourceType] || item.sourceType}
              </Badge>
              {item.reliabilityTier && (
                <Badge variant="outline" className="text-xs">
                  {item.reliabilityTier.replace('_', ' ')}
                </Badge>
              )}
            </div>
            <CardTitle className="line-clamp-2 text-sm">{item.title}</CardTitle>
          </div>
          <div className="flex shrink-0 gap-1">
            {item.url && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => window.open(item.url!, '_blank')}
              >
                <ExternalLink className="size-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => onView(item)}
            >
              <Eye className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(item.id)}
              disabled={isDeleting}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {item.summary && (
          <CardDescription className="line-clamp-3 text-xs">
            {item.summary}
          </CardDescription>
        )}

        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-xs">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {new Date(item.createdAt).toLocaleDateString()}
        </p>
      </CardHeader>
    </Card>
  );
}
