'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Expand, AlertTriangle, Loader2 } from 'lucide-react';
import type { Outline } from '../types';

interface OutlinePanelProps {
  outline: Outline;
  onExpand: (sectionId: string) => void;
  expandingSection: string | null;
}

export function OutlinePanel({ outline, onExpand, expandingSection }: OutlinePanelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Outline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {outline.thesis && (
          <div className="rounded-md bg-primary/5 p-2">
            <p className="text-[10px] font-medium text-muted-foreground">THESIS</p>
            <p className="text-xs">{outline.thesis}</p>
          </div>
        )}

        <div className="space-y-2">
          {outline.sections.map((section) => (
            <div
              key={section.id}
              className="rounded-md border p-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-semibold">{section.heading}</h4>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onExpand(section.id)}
                  disabled={expandingSection !== null}
                  title="Expand section"
                >
                  {expandingSection === section.id ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Expand className="size-3" />
                  )}
                </Button>
              </div>

              {section.openingLine && (
                <p className="mt-1 text-[10px] italic text-muted-foreground">
                  {section.openingLine}
                </p>
              )}

              {section.points.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {section.points.map((point, i) => (
                    <li key={i} className="text-[10px] text-muted-foreground">
                      • {point}
                    </li>
                  ))}
                </ul>
              )}

              {section.sources.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {section.sources.map((src, i) => (
                    <Badge key={i} variant="outline" className="text-[8px]">
                      {src}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {outline.researchGaps.length > 0 && (
          <div className="rounded-md bg-yellow-50 p-2 dark:bg-yellow-950">
            <div className="flex items-center gap-1 mb-1">
              <AlertTriangle className="size-3 text-yellow-600" />
              <p className="text-[10px] font-medium text-yellow-700 dark:text-yellow-400">
                Research Gaps
              </p>
            </div>
            <ul className="space-y-0.5">
              {outline.researchGaps.map((gap, i) => (
                <li key={i} className="text-[10px] text-yellow-700 dark:text-yellow-400">
                  • {gap}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
