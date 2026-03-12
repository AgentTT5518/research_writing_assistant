'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Loader2, CalendarDays } from 'lucide-react';
import { ScheduleCard } from './schedule-card';
import { useSchedules, useCancelSchedule, useUpdateSchedule } from '../hooks';
import { cn } from '@/shared/lib/utils';

const STATUS_FILTERS = ['all', 'pending', 'published', 'failed', 'cancelled'] as const;
const PLATFORM_FILTERS = ['all', 'blog', 'linkedin', 'both'] as const;

export function ScheduleDashboard() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  const { data: schedules, isLoading } = useSchedules({
    status: statusFilter === 'all' ? undefined : statusFilter,
    platform: platformFilter === 'all' ? undefined : platformFilter,
  });

  const cancelSchedule = useCancelSchedule();
  const updateSchedule = useUpdateSchedule();

  const handleCancel = (id: string) => {
    cancelSchedule.mutate(id);
  };

  const handleRetry = (id: string) => {
    updateSchedule.mutate({
      id,
      data: { status: 'pending' },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5" />
          <h1 className="text-2xl font-bold">Schedule Dashboard</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Status</span>
          <div className="flex gap-1">
            {STATUS_FILTERS.map((s) => (
              <Badge
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer text-xs capitalize',
                  statusFilter === s && 'bg-primary text-primary-foreground',
                )}
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </Badge>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Platform</span>
          <div className="flex gap-1">
            {PLATFORM_FILTERS.map((p) => (
              <Badge
                key={p}
                variant={platformFilter === p ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer text-xs capitalize',
                  platformFilter === p && 'bg-primary text-primary-foreground',
                )}
                onClick={() => setPlatformFilter(p)}
              >
                {p}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : !schedules || schedules.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No scheduled posts found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    onCancel={handleCancel}
                    onRetry={handleRetry}
                    isCancelling={cancelSchedule.isPending}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
