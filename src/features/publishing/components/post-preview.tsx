'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Linkedin, Globe } from 'lucide-react';

interface PostPreviewProps {
  blogTitle?: string | null;
  blogContent?: string | null;
  blogExcerpt?: string | null;
  linkedinContent?: string | null;
  coverImagePath?: string | null;
}

export function PostPreview({
  blogTitle,
  blogContent,
  linkedinContent,
  coverImagePath,
}: PostPreviewProps) {
  return (
    <div className="space-y-4">
      {linkedinContent && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Linkedin className="size-4 text-blue-600" />
              LinkedIn Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{linkedinContent}</p>
            <div className="mt-2 flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">
                {linkedinContent.length} / 3000 chars
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {blogTitle && blogContent && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Globe className="size-4 text-orange-600" />
              Blog Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {coverImagePath && (
              <div className="mb-3 overflow-hidden rounded-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImagePath.startsWith('data/') ? `/${coverImagePath}` : coverImagePath}
                  alt="Cover"
                  className="w-full h-32 object-cover"
                />
              </div>
            )}
            <h3 className="font-semibold text-base mb-2">{blogTitle}</h3>
            <div
              className="prose prose-sm max-w-none max-h-48 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: blogContent }}
            />
          </CardContent>
        </Card>
      )}

      {!linkedinContent && !blogTitle && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No content to preview
          </CardContent>
        </Card>
      )}
    </div>
  );
}
