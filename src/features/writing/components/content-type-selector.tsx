'use client';

import { Button } from '@/shared/components/ui/button';
import { Linkedin, BookOpen } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { ContentType } from '../types';

interface ContentTypeSelectorProps {
  value: ContentType;
  onChange: (type: ContentType) => void;
  disabled?: boolean;
}

export function ContentTypeSelector({ value, onChange, disabled }: ContentTypeSelectorProps) {
  return (
    <div className="flex gap-1">
      <Button
        variant={value === 'linkedin' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onChange('linkedin')}
        disabled={disabled}
        className={cn('flex-1')}
      >
        <Linkedin className="size-3.5 mr-1.5" />
        LinkedIn
      </Button>
      <Button
        variant={value === 'blog' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onChange('blog')}
        disabled={disabled}
        className={cn('flex-1')}
      >
        <BookOpen className="size-3.5 mr-1.5" />
        Blog
      </Button>
    </div>
  );
}
