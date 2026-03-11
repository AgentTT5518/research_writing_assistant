'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Search, GraduationCap, Link2 } from 'lucide-react';
import { WebSearchForm } from './web-search-form';
import { AcademicSearchForm } from './academic-search-form';
import { UrlImportForm } from './url-import-form';

type SearchTab = 'web' | 'academic' | 'url';

interface SearchPanelProps {
  projectId: string;
}

export function SearchPanel({ projectId }: SearchPanelProps) {
  const [activeTab, setActiveTab] = useState<SearchTab>('web');

  const tabs: { id: SearchTab; label: string; icon: React.ReactNode }[] = [
    { id: 'web', label: 'Web Search', icon: <Search className="size-3.5" /> },
    { id: 'academic', label: 'Academic', icon: <GraduationCap className="size-3.5" /> },
    { id: 'url', label: 'URL Import', icon: <Link2 className="size-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            className="flex-1 text-xs"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span className="ml-1.5">{tab.label}</span>
          </Button>
        ))}
      </div>

      {activeTab === 'web' && <WebSearchForm projectId={projectId} />}
      {activeTab === 'academic' && <AcademicSearchForm projectId={projectId} />}
      {activeTab === 'url' && <UrlImportForm projectId={projectId} />}
    </div>
  );
}
