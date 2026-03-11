'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Search, PenTool, Pencil, Trash2 } from 'lucide-react';
import { useProject } from '../hooks';
import { ProjectEditDialog } from './project-edit-dialog';
import { ProjectDeleteDialog } from './project-delete-dialog';

export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const { data: project, isLoading, error } = useProject(projectId);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-lg bg-muted" />;
  }

  if (error || !project) {
    return <p className="text-destructive">Failed to load project.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
              {project.status}
            </Badge>
          </div>
          {project.description && (
            <p className="mt-1 text-muted-foreground">{project.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" data-icon="inline-start" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" data-icon="inline-start" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Research Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{project.researchItemCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Drafts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{project.draftCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Link href={`/projects/${projectId}/research`}>
          <Button variant="outline">
            <Search className="size-4" data-icon="inline-start" />
            Start Research
          </Button>
        </Link>
        <Link href={`/projects/${projectId}/write`}>
          <Button variant="outline">
            <PenTool className="size-4" data-icon="inline-start" />
            Write Draft
          </Button>
        </Link>
      </div>

      <p className="text-xs text-muted-foreground">
        Created {new Date(project.createdAt).toLocaleDateString()} &middot;
        Updated {new Date(project.updatedAt).toLocaleDateString()}
      </p>

      <ProjectEditDialog
        project={project}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <ProjectDeleteDialog
        projectId={project.id}
        projectName={project.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}
