'use client';

import { useCallback, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { ImageIcon, Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useUploadCoverImage } from '../hooks';

interface CoverImageUploadProps {
  draftId: string;
  currentPath?: string | null;
}

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function CoverImageUpload({ draftId, currentPath }: CoverImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(
    currentPath ? `/${currentPath}` : null,
  );
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const uploadMutation = useUploadCoverImage();

  const validateAndUpload = useCallback(
    (file: File) => {
      setValidationError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setValidationError('Only PNG, JPEG, and WebP images are accepted.');
        return;
      }
      if (file.size > MAX_SIZE) {
        setValidationError('File exceeds 5MB limit.');
        return;
      }

      // Show local preview
      const url = URL.createObjectURL(file);
      setPreview(url);

      uploadMutation.mutate(
        { draftId, file },
        {
          onSuccess: (data) => {
            URL.revokeObjectURL(url);
            setPreview(`/${data.path}`);
          },
          onError: () => {
            URL.revokeObjectURL(url);
            setPreview(currentPath ? `/${currentPath}` : null);
          },
        },
      );
    },
    [draftId, currentPath, uploadMutation],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndUpload(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndUpload(file);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Cover Image</CardTitle>
      </CardHeader>
      <CardContent>
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Cover preview"
              className="aspect-video w-full rounded-lg object-cover"
            />
            <Button
              variant="destructive"
              size="icon-xs"
              className="absolute right-2 top-2"
              onClick={() => setPreview(null)}
            >
              <X className="size-3" />
            </Button>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              'flex aspect-video flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25',
            )}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <ImageIcon className="size-6 text-muted-foreground" />
                <p className="mt-2 text-xs text-muted-foreground">
                  Drag & drop or click to upload
                </p>
                <label className="mt-2 cursor-pointer">
                  <span className="inline-flex items-center rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
                    <Upload className="size-3 mr-1" />
                    Choose file
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              </>
            )}
          </div>
        )}

        {validationError && (
          <p className="mt-2 text-xs text-destructive">{validationError}</p>
        )}
        {uploadMutation.error && (
          <p className="mt-2 text-xs text-destructive">
            {uploadMutation.error.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
