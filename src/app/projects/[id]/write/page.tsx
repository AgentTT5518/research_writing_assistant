'use client';

import { WritingWorkspace } from '@/features/writing/components';

export default function WritePage({ params }: { params: { id: string } }) {
  return <WritingWorkspace projectId={params.id} />;
}
