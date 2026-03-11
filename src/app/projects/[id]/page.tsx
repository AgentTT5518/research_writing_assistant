'use client';

import { useParams } from 'next/navigation';
import { ProjectDetailPage } from '@/features/content-management/components';

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  return <ProjectDetailPage projectId={params.id} />;
}
