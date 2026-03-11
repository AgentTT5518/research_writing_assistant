'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Link2, Loader2, Check } from 'lucide-react';
import { useUrlScrape } from '../hooks';
import type { ResearchItem } from '@/shared/types';

interface UrlImportFormProps {
  projectId: string;
}

export function UrlImportForm({ projectId }: UrlImportFormProps) {
  const [url, setUrl] = useState('');
  const [imported, setImported] = useState<ResearchItem | null>(null);
  const urlScrape = useUrlScrape();

  function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setImported(null);
    urlScrape.mutate(
      { url: url.trim(), projectId },
      {
        onSuccess: (data) => {
          setImported(data);
          setUrl('');
        },
      }
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleImport} className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article"
          type="url"
          className="flex-1"
        />
        <Button type="submit" disabled={urlScrape.isPending || !url.trim()}>
          {urlScrape.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Link2 className="size-4" />
          )}
          <span className="ml-1.5">Import</span>
        </Button>
      </form>

      {urlScrape.isPending && (
        <div className="flex items-center gap-2 rounded-md border border-dashed p-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Fetching and summarizing content...
          </p>
        </div>
      )}

      {urlScrape.error && (
        <p className="text-sm text-destructive">{urlScrape.error.message}</p>
      )}

      {imported && (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CardHeader className="p-3">
            <div className="flex items-center gap-2">
              <Check className="size-4 text-green-600" />
              <CardTitle className="text-sm text-green-800 dark:text-green-200">
                Imported: {imported.title}
              </CardTitle>
            </div>
            {imported.summary && (
              <CardDescription className="mt-1 line-clamp-3 text-xs">
                {imported.summary}
              </CardDescription>
            )}
          </CardHeader>
        </Card>
      )}

      <div className="rounded-md border border-dashed p-3">
        <p className="text-xs text-muted-foreground">
          Paste a URL to automatically fetch, extract, and summarize the content using AI.
          The result will be saved to your research library.
        </p>
      </div>
    </div>
  );
}
