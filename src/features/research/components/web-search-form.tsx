'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Search, Plus, Loader2 } from 'lucide-react';
import { useWebSearch, useCreateResearchItem } from '../hooks';
import type { TavilyResult } from '@/shared/lib/tavily-client';

interface WebSearchFormProps {
  projectId: string;
}

export function WebSearchForm({ projectId }: WebSearchFormProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TavilyResult[]>([]);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const webSearch = useWebSearch();
  const createItem = useCreateResearchItem();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    webSearch.mutate(
      { query: query.trim(), projectId },
      {
        onSuccess: (data) => {
          setResults(data);
        },
      }
    );
  }

  function handleSave(result: TavilyResult) {
    const key = result.url;
    setSavingIds((prev) => new Set(prev).add(key));

    createItem.mutate(
      {
        projectId,
        sourceType: 'web',
        title: result.title,
        url: result.url,
        content: result.content,
        summary: result.content.slice(0, 500),
        reliabilityTier: 'unknown',
      },
      {
        onSettled: () => {
          setSavingIds((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        },
      }
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the web..."
          className="flex-1"
        />
        <Button type="submit" disabled={webSearch.isPending || !query.trim()}>
          {webSearch.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          <span className="ml-1.5">Search</span>
        </Button>
      </form>

      {webSearch.error && (
        <p className="text-sm text-destructive">{webSearch.error.message}</p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {results.length} results found
          </p>
          {results.map((result) => (
            <Card key={result.url} className="transition-colors hover:bg-muted/30">
              <CardHeader className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {result.title}
                      </a>
                    </CardTitle>
                    <CardDescription className="mt-1 line-clamp-2 text-xs">
                      {result.content}
                    </CardDescription>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        Score: {result.score.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => handleSave(result)}
                    disabled={savingIds.has(result.url)}
                  >
                    {savingIds.has(result.url) ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Plus className="size-3" />
                    )}
                    <span className="ml-1">Save</span>
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
