'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Linkedin, Loader2, Unlink } from 'lucide-react';
import { useConfig, useUpdateConfig } from '../hooks';

export function LinkedInConnect() {
  const searchParams = useSearchParams();
  const { data: config, isLoading } = useConfig();
  const updateConfig = useUpdateConfig();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Read OAuth callback result from query params
  useEffect(() => {
    const linkedinParam = searchParams.get('linkedin');
    if (linkedinParam === 'connected') {
      setMessage({ type: 'success', text: 'LinkedIn account connected successfully!' });
    } else if (linkedinParam === 'denied') {
      setMessage({ type: 'error', text: 'LinkedIn authorization was denied.' });
    } else if (linkedinParam === 'error') {
      setMessage({ type: 'error', text: 'LinkedIn connection failed. Please try again.' });
    }
  }, [searchParams]);

  const handleConnect = () => {
    // Navigate to LinkedIn OAuth — the auth URL is generated server-side
    window.location.href = '/api/publish/linkedin/auth';
  };

  const handleDisconnect = () => {
    updateConfig.mutate({ key: 'linkedin_tokens', value: null });
    setMessage(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isConnected = config?.linkedinConnected ?? false;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Linkedin className="size-4 text-blue-600" />
          LinkedIn Connection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isConnected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-800">Connected</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={updateConfig.isPending}
            >
              <Unlink className="size-3.5 mr-1.5" />
              Disconnect
            </Button>
          </div>
        ) : (
          <Button onClick={handleConnect} className="w-full">
            <Linkedin className="size-4 mr-2" />
            Connect LinkedIn
          </Button>
        )}

        {message && (
          <p className={`text-xs ${message.type === 'success' ? 'text-green-700' : 'text-destructive'}`}>
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
