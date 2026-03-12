'use client';

import { Suspense } from 'react';
import { SettingsPageContent } from '@/features/publishing/components';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loader2 className="size-6 animate-spin mx-auto mt-12 text-muted-foreground" />}>
      <SettingsPageContent />
    </Suspense>
  );
}
