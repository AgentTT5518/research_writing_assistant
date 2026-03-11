'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Linkedin, BookOpen } from 'lucide-react';
import type { ContentType } from '../types';

interface PlatformPreviewProps {
  contentType: ContentType;
  linkedinContent?: string | null;
  blogTitle?: string | null;
  blogContent?: string | null;
  blogExcerpt?: string | null;
  coverImagePath?: string | null;
}

const LINKEDIN_PREVIEW_LIMIT = 210;

export function PlatformPreview({
  contentType,
  linkedinContent,
  blogTitle,
  blogContent,
  blogExcerpt,
  coverImagePath,
}: PlatformPreviewProps) {
  if (contentType === 'linkedin') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Linkedin className="size-4 text-blue-600" />
            <CardTitle className="text-sm">LinkedIn Preview</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {linkedinContent ? (
            <div className="rounded-lg border bg-white p-4 text-sm text-gray-900 dark:bg-gray-50">
              <div className="mb-2 flex items-center gap-2">
                <div className="size-8 rounded-full bg-gray-300" />
                <div>
                  <p className="text-xs font-semibold">Your Name</p>
                  <p className="text-[10px] text-gray-500">Just now</p>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-xs leading-relaxed">
                {linkedinContent.length > LINKEDIN_PREVIEW_LIMIT
                  ? `${linkedinContent.slice(0, LINKEDIN_PREVIEW_LIMIT)}...`
                  : linkedinContent}
              </p>
              {linkedinContent.length > LINKEDIN_PREVIEW_LIMIT && (
                <button className="mt-1 text-[10px] font-medium text-gray-500">
                  ...see more
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No content yet</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-primary" />
          <CardTitle className="text-sm">Blog Preview</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {blogTitle || blogContent ? (
          <div className="space-y-3">
            {coverImagePath && (
              <div className="aspect-video overflow-hidden rounded-lg bg-muted">
                <img
                  src={`/${coverImagePath}`}
                  alt="Cover"
                  className="size-full object-cover"
                />
              </div>
            )}
            {blogTitle && (
              <h3 className="text-base font-bold leading-tight">{blogTitle}</h3>
            )}
            {blogExcerpt && (
              <p className="text-xs italic text-muted-foreground">{blogExcerpt}</p>
            )}
            {blogContent && (
              <div
                className="prose prose-sm max-w-none text-xs"
                dangerouslySetInnerHTML={{ __html: blogContent }}
              />
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No content yet</p>
        )}
      </CardContent>
    </Card>
  );
}
