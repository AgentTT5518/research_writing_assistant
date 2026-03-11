'use client';

import { cn } from '@/shared/lib/utils';

interface CharacterCounterProps {
  current: number;
  limit: number;
}

export function CharacterCounter({ current, limit }: CharacterCounterProps) {
  const percentage = (current / limit) * 100;

  return (
    <p
      className={cn(
        'text-xs font-medium tabular-nums',
        percentage < 80 && 'text-green-600 dark:text-green-400',
        percentage >= 80 && percentage < 95 && 'text-yellow-600 dark:text-yellow-400',
        percentage >= 95 && 'text-red-600 dark:text-red-400',
      )}
    >
      {current}/{limit}
    </p>
  );
}
