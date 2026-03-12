'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import type { EnvVarStatus } from '../types';

interface ApiKeyStatusProps {
  envStatus: EnvVarStatus;
}

const KEY_LABELS: { key: keyof EnvVarStatus; label: string }[] = [
  { key: 'anthropic', label: 'Anthropic (Claude API)' },
  { key: 'tavily', label: 'Tavily (Web Search)' },
  { key: 'firebase', label: 'Firebase (Blog)' },
  { key: 'linkedinClient', label: 'LinkedIn (OAuth)' },
];

export function ApiKeyStatus({ envStatus }: ApiKeyStatusProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">API Key Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {KEY_LABELS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span>{label}</span>
              <div className="flex items-center gap-1.5">
                <div
                  className={`size-2.5 rounded-full ${
                    envStatus[key] ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-xs text-muted-foreground">
                  {envStatus[key] ? 'Configured' : 'Missing'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
