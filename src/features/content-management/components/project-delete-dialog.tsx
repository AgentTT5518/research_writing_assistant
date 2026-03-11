'use client';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { useDeleteProject } from '../hooks';

interface ProjectDeleteDialogProps {
  projectId: string;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectDeleteDialog({
  projectId,
  projectName,
  open,
  onOpenChange,
}: ProjectDeleteDialogProps) {
  const deleteProject = useDeleteProject();

  function handleDelete() {
    deleteProject.mutate(projectId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Project</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{projectName}&rdquo;? This
            will also delete all research items and drafts. This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        {deleteProject.error && (
          <p className="text-sm text-destructive">
            {deleteProject.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteProject.isPending}
          >
            {deleteProject.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
