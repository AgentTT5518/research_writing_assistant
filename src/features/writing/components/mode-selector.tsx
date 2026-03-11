'use client';

import { Card, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { FileText, List, Users } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { WritingMode } from '../types';

interface ModeSelectorProps {
  value: WritingMode;
  onChange: (mode: WritingMode) => void;
  disabled?: boolean;
}

const modes: { value: WritingMode; label: string; description: string; icon: typeof FileText }[] = [
  {
    value: 'full_draft',
    label: 'Full Draft',
    description: 'AI generates a complete first draft',
    icon: FileText,
  },
  {
    value: 'outline_expand',
    label: 'Outline + Expand',
    description: 'Generate outline, then expand section by section',
    icon: List,
  },
  {
    value: 'co_writing',
    label: 'Co-Writing',
    description: 'Write together with AI assistance',
    icon: Users,
  },
];

export function ModeSelector({ value, onChange, disabled }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {modes.map((mode) => (
        <Card
          key={mode.value}
          size="sm"
          className={cn(
            'cursor-pointer transition-colors',
            value === mode.value
              ? 'border-primary bg-primary/5'
              : 'hover:bg-muted/50',
            disabled && 'cursor-not-allowed opacity-60',
          )}
          onClick={() => !disabled && onChange(mode.value)}
        >
          <CardHeader className="items-center p-3 text-center">
            <mode.icon
              className={cn(
                'size-5 mb-1',
                value === mode.value ? 'text-primary' : 'text-muted-foreground',
              )}
            />
            <CardTitle className="text-xs">{mode.label}</CardTitle>
            <CardDescription className="text-[10px] leading-tight">
              {mode.description}
            </CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
