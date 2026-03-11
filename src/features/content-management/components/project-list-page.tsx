'use client';

import { useProjects } from '../hooks';
import { ProjectCard } from './project-card';
import { ProjectCreateDialog } from './project-create-dialog';
import { FolderKanban } from 'lucide-react';

export function ProjectListPage() {
  const { data: projects, isLoading, error } = useProjects();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Projects</h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Projects</h1>
        <p className="mt-2 text-destructive">Failed to load projects.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <ProjectCreateDialog />
      </div>
      {projects && projects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <FolderKanban className="mb-4 size-12 text-muted-foreground" />
          <h2 className="text-lg font-medium">No projects yet</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Create your first project to get started.
          </p>
          <ProjectCreateDialog />
        </div>
      )}
    </div>
  );
}
