'use client';

import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { TableCell, TableRow } from '@/shared/components/ui/table';
import { ExternalLink, X, RotateCcw, Linkedin, Globe } from 'lucide-react';
import { PublishStatus } from './publish-status';
import type { ScheduleWithDraft } from '../types';

interface ScheduleCardProps {
  schedule: ScheduleWithDraft;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  isCancelling?: boolean;
}

const PLATFORM_CONFIG: Record<string, { label: string; icon: typeof Globe }> = {
  blog: { label: 'Blog', icon: Globe },
  linkedin: { label: 'LinkedIn', icon: Linkedin },
  both: { label: 'Both', icon: Globe },
};

export function ScheduleCard({ schedule, onCancel, onRetry, isCancelling }: ScheduleCardProps) {
  const platformConfig = PLATFORM_CONFIG[schedule.platform] ?? PLATFORM_CONFIG.blog;
  const PlatformIcon = platformConfig.icon;
  const scheduledDate = schedule.scheduledAt ? new Date(schedule.scheduledAt) : null;

  return (
    <TableRow>
      <TableCell className="font-medium text-sm">
        {schedule.draft?.blogTitle ?? schedule.draft?.linkedinContent?.slice(0, 50) ?? 'Untitled'}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          <PlatformIcon className="size-3 mr-1" />
          {platformConfig.label}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {scheduledDate
          ? new Intl.DateTimeFormat(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(scheduledDate)
          : '—'}
      </TableCell>
      <TableCell>
        <PublishStatus
          status={schedule.status ?? 'pending'}
          errorMessage={schedule.errorMessage}
          publishedUrl={schedule.publishedUrl}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {schedule.status === 'pending' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(schedule.id)}
              disabled={isCancelling}
              className="h-7 px-2"
              title="Cancel"
            >
              <X className="size-3.5" />
            </Button>
          )}
          {schedule.status === 'failed' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRetry(schedule.id)}
              className="h-7 px-2"
              title="Retry"
            >
              <RotateCcw className="size-3.5" />
            </Button>
          )}
          {schedule.publishedUrl && (
            <a
              href={schedule.publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm" className="h-7 px-2" title="View">
                <ExternalLink className="size-3.5" />
              </Button>
            </a>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
