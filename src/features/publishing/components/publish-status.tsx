'use client';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { AlertCircle, CheckCircle2, Clock, Loader2, XCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface PublishStatusProps {
  status: string;
  errorMessage?: string | null;
  publishedUrl?: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
}

const STATUS_CONFIG: Record<string, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: typeof Clock;
  className: string;
}> = {
  pending: { label: 'Pending', variant: 'secondary', icon: Clock, className: 'bg-yellow-100 text-yellow-800' },
  publishing: { label: 'Publishing', variant: 'default', icon: Loader2, className: 'bg-blue-100 text-blue-800' },
  published: { label: 'Published', variant: 'default', icon: CheckCircle2, className: 'bg-green-100 text-green-800' },
  failed: { label: 'Failed', variant: 'destructive', icon: AlertCircle, className: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelled', variant: 'outline', icon: XCircle, className: 'bg-gray-100 text-gray-800' },
};

export function PublishStatus({ status, errorMessage, publishedUrl, onRetry, isRetrying }: PublishStatusProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Badge className={config.className}>
          <Icon className={cn('size-3 mr-1', status === 'publishing' && 'animate-spin')} />
          {config.label}
        </Badge>

        {publishedUrl && (
          <a
            href={publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            View post
          </a>
        )}
      </div>

      {errorMessage && status === 'failed' && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-destructive">{errorMessage}</p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={isRetrying}
              className="h-6 px-2 text-xs"
            >
              {isRetrying ? (
                <Loader2 className="size-3 mr-1 animate-spin" />
              ) : (
                <RotateCcw className="size-3 mr-1" />
              )}
              Retry
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
