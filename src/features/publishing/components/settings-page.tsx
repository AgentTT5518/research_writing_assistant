'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Settings, Link, FileText, BarChart3 } from 'lucide-react';
import { useConfig } from '../hooks';
import { ApiKeyStatus } from './api-key-status';
import { LinkedInConnect } from './linkedin-connect';
import { BanListEditor } from './ban-list-editor';
import { AiUsageDashboard } from './ai-usage-dashboard';
import { Loader2 } from 'lucide-react';

export function SettingsPageContent() {
  const { data: config, isLoading } = useConfig();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="size-5" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <Tabs defaultValue="connections">
        <TabsList>
          <TabsTrigger value="connections">
            <Link className="size-3.5 mr-1.5" />
            Connections
          </TabsTrigger>
          <TabsTrigger value="content">
            <FileText className="size-3.5 mr-1.5" />
            Content Settings
          </TabsTrigger>
          <TabsTrigger value="usage">
            <BarChart3 className="size-3.5 mr-1.5" />
            AI Usage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-4 mt-4">
          {config?.envStatus && <ApiKeyStatus envStatus={config.envStatus} />}
          <LinkedInConnect />
        </TabsContent>

        <TabsContent value="content" className="space-y-4 mt-4">
          <BanListEditor />
        </TabsContent>

        <TabsContent value="usage" className="mt-4">
          <AiUsageDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
