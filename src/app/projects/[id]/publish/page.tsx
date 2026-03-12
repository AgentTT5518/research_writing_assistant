'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PublishWorkspace } from '@/features/publishing/components';
import { useDrafts } from '@/features/writing/hooks';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Loader2, Send } from 'lucide-react';

export default function PublishPage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const initialDraftId = searchParams.get('draftId');
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(initialDraftId);

  const { data: drafts, isLoading } = useDrafts({ projectId: params.id });

  // Filter to publishable drafts
  const publishableDrafts = drafts?.filter(
    (d) => d.status === 'approved' || d.status === 'scheduled' || d.status === 'published'
  );

  if (selectedDraftId) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedDraftId(null)}
        >
          &larr; Back to drafts
        </Button>
        <PublishWorkspace projectId={params.id} draftId={selectedDraftId} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Send className="size-5" />
        <h1 className="text-2xl font-bold">Publish</h1>
      </div>

      {!publishableDrafts || publishableDrafts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No approved drafts to publish. Write and approve a draft first.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {publishableDrafts.map((draft) => (
            <Card
              key={draft.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedDraftId(draft.id)}
            >
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">
                    {draft.blogTitle || draft.linkedinContent?.slice(0, 60) || 'Untitled'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Updated {new Date(draft.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge
                  className={
                    draft.status === 'approved' ? 'bg-green-100 text-green-800' :
                    draft.status === 'published' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-orange-100 text-orange-800'
                  }
                >
                  {draft.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
