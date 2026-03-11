'use client';

import { Separator } from '@/shared/components/ui/separator';
import { SearchPanel } from './search-panel';
import { ResearchLibrary } from './research-library';

interface ResearchWorkspaceProps {
  projectId: string;
}

export function ResearchWorkspace({ projectId }: ResearchWorkspaceProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Research Workspace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search the web, import URLs, and find academic papers for your project.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Find Research
          </h2>
          <SearchPanel projectId={projectId} />
        </div>

        <div className="space-y-4">
          <Separator className="lg:hidden" />
          <ResearchLibrary projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
