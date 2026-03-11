'use client';

import { ResearchWorkspace } from '@/features/research/components';

export default function ResearchPage({ params }: { params: { id: string } }) {
  return <ResearchWorkspace projectId={params.id} />;
}
