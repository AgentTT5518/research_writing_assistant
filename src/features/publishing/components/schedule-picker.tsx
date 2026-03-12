'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Calendar, Loader2 } from 'lucide-react';

interface SchedulePickerProps {
  onSchedule: (data: { platform: 'linkedin' | 'blog' | 'both'; scheduledAt: string }) => void;
  isSubmitting?: boolean;
  disabled?: boolean;
}

export function SchedulePicker({ onSchedule, isSubmitting, disabled }: SchedulePickerProps) {
  const [platform, setPlatform] = useState<'linkedin' | 'blog' | 'both'>('both');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');

  const handleSubmit = () => {
    if (!dateStr || !timeStr) return;

    // Combine date and time in local timezone, then convert to ISO UTC
    const localDateTime = new Date(`${dateStr}T${timeStr}`);
    if (isNaN(localDateTime.getTime()) || localDateTime.getTime() <= Date.now()) return;

    onSchedule({
      platform,
      scheduledAt: localDateTime.toISOString(),
    });
  };

  const isValid = dateStr && timeStr && (() => {
    const dt = new Date(`${dateStr}T${timeStr}`);
    return !isNaN(dt.getTime()) && dt.getTime() > Date.now();
  })();

  // Min date is today
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Platform</Label>
        <Select value={platform} onValueChange={(v) => setPlatform(v as typeof platform)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="both">Both (Blog + LinkedIn)</SelectItem>
            <SelectItem value="blog">Blog only</SelectItem>
            <SelectItem value="linkedin">LinkedIn only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Date</Label>
          <Input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            min={today}
            className="h-8 text-sm"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Time</Label>
          <Input
            type="time"
            value={timeStr}
            onChange={(e) => setTimeStr(e.target.value)}
            className="h-8 text-sm"
            disabled={disabled}
          />
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!isValid || isSubmitting || disabled}
        className="w-full"
        size="sm"
      >
        {isSubmitting ? (
          <Loader2 className="size-3.5 mr-1.5 animate-spin" />
        ) : (
          <Calendar className="size-3.5 mr-1.5" />
        )}
        Schedule
      </Button>
    </div>
  );
}
