'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { ShieldCheck, X, ArrowRight } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { AntiSlopReport as AntiSlopReportType } from '../types';

interface AntiSlopReportProps {
  report: AntiSlopReportType;
  onApplyAll?: () => void;
  onDismiss: () => void;
  onDeepReview?: () => void;
  isReviewing?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  if (score >= 70) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
}

export function AntiSlopReportView({
  report,
  onApplyAll,
  onDismiss,
  onDeepReview,
  isReviewing,
}: AntiSlopReportProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            <CardTitle className="text-sm">Anti-Slop Review</CardTitle>
          </div>
          <Button variant="ghost" size="icon-xs" onClick={onDismiss}>
            <X className="size-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge className={cn('text-sm font-bold', getScoreColor(report.score))}>
            {report.score}/100
          </Badge>
          <span className="text-xs text-muted-foreground">
            {report.score >= 90 ? 'Excellent' : report.score >= 70 ? 'Good' : 'Needs Work'}
          </span>
        </div>

        {report.suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium">
              Top suggestions ({report.suggestions.length})
            </p>
            {report.suggestions.slice(0, 5).map((s, i) => (
              <div key={i} className="rounded-md bg-muted/50 p-2 text-xs">
                <p className="mb-1 font-medium text-muted-foreground">{s.issue}</p>
                <div className="flex items-center gap-1">
                  <span className="line-through text-red-600/70">{s.original}</span>
                  <ArrowRight className="size-3 text-muted-foreground" />
                  <span className="font-medium text-green-700 dark:text-green-400">
                    {s.suggested}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">{s.reason}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          {report.revisedContent && onApplyAll && (
            <Button size="xs" onClick={onApplyAll}>
              Apply All
            </Button>
          )}
          {onDeepReview && (
            <Button
              size="xs"
              variant="outline"
              onClick={onDeepReview}
              disabled={isReviewing}
            >
              {isReviewing ? 'Reviewing...' : 'Deep Review'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
