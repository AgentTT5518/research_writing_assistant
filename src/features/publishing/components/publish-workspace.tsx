'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Separator } from '@/shared/components/ui/separator';
import { Send, Calendar, Loader2, Globe, Linkedin } from 'lucide-react';
import { PostPreview } from './post-preview';
import { SchedulePicker } from './schedule-picker';
import { PublishStatus } from './publish-status';
import { usePublishBlog, usePublishLinkedIn, useCreateSchedule } from '../hooks';
import { useDraft } from '@/features/writing/hooks';

interface PublishWorkspaceProps {
  projectId: string;
  draftId: string;
}

const STATUS_COLORS: Record<string, string> = {
  generating: 'bg-blue-100 text-blue-800',
  draft: 'bg-gray-100 text-gray-800',
  reviewing: 'bg-purple-100 text-purple-800',
  approved: 'bg-green-100 text-green-800',
  scheduled: 'bg-orange-100 text-orange-800',
  published: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
};

export function PublishWorkspace({ projectId, draftId }: PublishWorkspaceProps) {
  const [showSchedule, setShowSchedule] = useState(false);
  const { data: draft, isLoading } = useDraft(draftId);
  const publishBlog = usePublishBlog();
  const publishLinkedIn = usePublishLinkedIn();
  const createSchedule = useCreateSchedule();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!draft) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Draft not found
      </p>
    );
  }

  const canPublish = draft.status === 'approved' || draft.status === 'scheduled';
  const isPublishing = publishBlog.isPending || publishLinkedIn.isPending;

  const handlePublish = (target: 'blog' | 'linkedin' | 'both') => {
    if (target === 'blog' || target === 'both') {
      publishBlog.mutate(draftId);
    }
    if (target === 'linkedin' || target === 'both') {
      publishLinkedIn.mutate(draftId);
    }
  };

  const handleSchedule = (data: { platform: 'linkedin' | 'blog' | 'both'; scheduledAt: string }) => {
    createSchedule.mutate({
      draftId,
      platform: data.platform,
      scheduledAt: data.scheduledAt,
    });
  };

  return (
    <div className="flex gap-6">
      {/* Left: Preview */}
      <div className="flex-[3] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Post Preview</h2>
          <Badge className={STATUS_COLORS[draft.status ?? ''] ?? ''}>
            {draft.status}
          </Badge>
        </div>

        <PostPreview
          blogTitle={draft.blogTitle}
          blogContent={draft.blogContent}
          linkedinContent={draft.linkedinContent}
          coverImagePath={draft.coverImagePath}
        />
      </div>

      {/* Right: Actions */}
      <div className="flex-[2] space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Publish Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Publish Now */}
            <div className="space-y-2">
              <Button
                className="w-full"
                disabled={!canPublish || isPublishing}
                onClick={() => handlePublish('both')}
              >
                {isPublishing ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Send className="size-4 mr-2" />
                )}
                Publish to Both
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={!canPublish || isPublishing}
                  onClick={() => handlePublish('blog')}
                >
                  <Globe className="size-4 mr-2" />
                  Blog
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={!canPublish || isPublishing}
                  onClick={() => handlePublish('linkedin')}
                >
                  <Linkedin className="size-4 mr-2" />
                  LinkedIn
                </Button>
              </div>
            </div>

            {/* Schedule */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowSchedule(!showSchedule)}
              disabled={!canPublish}
            >
              <Calendar className="size-4 mr-2" />
              {showSchedule ? 'Hide Scheduler' : 'Schedule for Later'}
            </Button>

            {showSchedule && (
              <>
                <Separator />
                <SchedulePicker
                  onSchedule={handleSchedule}
                  isSubmitting={createSchedule.isPending}
                  disabled={!canPublish}
                />
              </>
            )}

            {!canPublish && draft.status !== 'published' && (
              <p className="text-xs text-muted-foreground">
                Draft must be approved before publishing.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Status */}
        {(publishBlog.isSuccess || publishLinkedIn.isSuccess || publishBlog.isError || publishLinkedIn.isError) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Publish Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {publishBlog.isSuccess && (
                <PublishStatus
                  status="published"
                  publishedUrl={publishBlog.data?.url}
                />
              )}
              {publishLinkedIn.isSuccess && (
                <PublishStatus
                  status="published"
                  publishedUrl={publishLinkedIn.data?.postUrl}
                />
              )}
              {publishBlog.isError && (
                <PublishStatus
                  status="failed"
                  errorMessage={publishBlog.error?.message}
                  onRetry={() => publishBlog.mutate(draftId)}
                  isRetrying={publishBlog.isPending}
                />
              )}
              {publishLinkedIn.isError && (
                <PublishStatus
                  status="failed"
                  errorMessage={publishLinkedIn.error?.message}
                  onRetry={() => publishLinkedIn.mutate(draftId)}
                  isRetrying={publishLinkedIn.isPending}
                />
              )}
            </CardContent>
          </Card>
        )}

        {createSchedule.isSuccess && (
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-green-700">
                Post scheduled successfully!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
