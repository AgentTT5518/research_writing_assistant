'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { ArrowRight, Sparkles, MessageSquare, Repeat2, Loader2 } from 'lucide-react';
import type { CoWriteAction } from '../types';

interface CoWritePanelProps {
  onAction: (action: CoWriteAction, instructions?: string) => void;
  hasSelection: boolean;
  isStreaming: boolean;
}

const actions: { value: CoWriteAction; label: string; icon: typeof ArrowRight; requiresSelection: boolean }[] = [
  { value: 'continue', label: 'Continue', icon: ArrowRight, requiresSelection: false },
  { value: 'improve', label: 'Improve', icon: Sparkles, requiresSelection: true },
  { value: 'suggest', label: 'Suggest', icon: MessageSquare, requiresSelection: false },
  { value: 'transform', label: 'Transform', icon: Repeat2, requiresSelection: true },
];

export function CoWritePanel({ onAction, hasSelection, isStreaming }: CoWritePanelProps) {
  const [instructions, setInstructions] = useState('');

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Co-Writing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => {
            const disabled =
              isStreaming || (action.requiresSelection && !hasSelection);
            return (
              <Button
                key={action.value}
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => onAction(action.value, instructions || undefined)}
                className="justify-start"
              >
                {isStreaming ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <action.icon className="size-3.5 mr-1.5" />
                )}
                {action.label}
              </Button>
            );
          })}
        </div>

        <Textarea
          placeholder="Instructions for AI (optional)..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          disabled={isStreaming}
          className="min-h-[60px] text-xs"
        />

        {!hasSelection && (
          <p className="text-[10px] text-muted-foreground">
            Select text in the editor to enable Improve and Transform
          </p>
        )}
      </CardContent>
    </Card>
  );
}
