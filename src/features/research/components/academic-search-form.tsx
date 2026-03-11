'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Search, Plus, Loader2, GraduationCap } from 'lucide-react';
import { useAcademicSearch, useCreateResearchItem } from '../hooks';
import type { AcademicResult } from '@/shared/lib/academic-client';

interface AcademicSearchFormProps {
  projectId: string;
}

export function AcademicSearchForm({ projectId }: AcademicSearchFormProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AcademicResult[]>([]);
  const [useSemanticScholar, setUseSemanticScholar] = useState(true);
  const [useArxiv, setUseArxiv] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const academicSearch = useAcademicSearch();
  const createItem = useCreateResearchItem();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    const sources: ('semantic_scholar' | 'arxiv')[] = [];
    if (useSemanticScholar) sources.push('semantic_scholar');
    if (useArxiv) sources.push('arxiv');

    if (sources.length === 0) return;

    academicSearch.mutate(
      { query: query.trim(), projectId, sources },
      {
        onSuccess: (data) => {
          setResults(data);
        },
      }
    );
  }

  function handleSave(result: AcademicResult) {
    const key = result.url;
    setSavingIds((prev) => new Set(prev).add(key));

    createItem.mutate(
      {
        projectId,
        sourceType: 'academic',
        title: result.title,
        url: result.url,
        content: result.abstract,
        summary: result.abstract.slice(0, 500),
        authors: JSON.stringify(result.authors),
        publishedDate: result.year ? String(result.year) : undefined,
        reliabilityTier: 'academic',
        metadata: JSON.stringify({ source: result.source }),
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
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search academic papers..."
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={academicSearch.isPending || !query.trim() || (!useSemanticScholar && !useArxiv)}
          >
            {academicSearch.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <GraduationCap className="size-4" />
            )}
            <span className="ml-1.5">Search</span>
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <Label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={useSemanticScholar}
              onChange={(e) => setUseSemanticScholar(e.target.checked)}
              className="rounded"
            />
            Semantic Scholar
          </Label>
          <Label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={useArxiv}
              onChange={(e) => setUseArxiv(e.target.checked)}
              className="rounded"
            />
            arXiv
          </Label>
        </div>
      </form>

      {academicSearch.error && (
        <p className="text-sm text-destructive">{academicSearch.error.message}</p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {results.length} papers found
          </p>
          {results.map((result, idx) => (
            <Card key={`${result.url}-${idx}`} className="transition-colors hover:bg-muted/30">
              <CardHeader className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-1.5">
                      <Badge variant="outline" className="text-xs">
                        {result.source === 'semantic_scholar' ? 'Semantic Scholar' : 'arXiv'}
                      </Badge>
                      {result.year && (
                        <span className="text-xs text-muted-foreground">{result.year}</span>
                      )}
                    </div>
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
                    {result.authors.length > 0 && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {result.authors.slice(0, 3).join(', ')}
                        {result.authors.length > 3 && ` +${result.authors.length - 3} more`}
                      </p>
                    )}
                    {result.abstract && (
                      <CardDescription className="mt-1 line-clamp-2 text-xs">
                        {result.abstract}
                      </CardDescription>
                    )}
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
