'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { Textarea } from '@/shared/components/ui/textarea';
import { Button } from '@/shared/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { useConfig, useUpdateConfig } from '../hooks';

export function BanListEditor() {
  const { data: config } = useConfig();
  const updateConfig = useUpdateConfig();
  const [text, setText] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config?.config) {
      const banList = config.config.vocabulary_ban_list;
      if (Array.isArray(banList)) {
        setText(banList.join('\n'));
      } else if (typeof banList === 'string') {
        setText(banList);
      }
    }
  }, [config]);

  const handleSave = () => {
    const words = text
      .split('\n')
      .map((w) => w.trim())
      .filter(Boolean);

    updateConfig.mutate(
      { key: 'vocabulary_ban_list', value: words },
      {
        onSuccess: () => setHasChanges(false),
      },
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Vocabulary Ban List</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          One word or phrase per line. These will be flagged during anti-slop review.
        </p>
        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setHasChanges(true);
          }}
          placeholder="leverage&#10;synergy&#10;game-changer&#10;deep dive"
          rows={6}
          className="text-sm font-mono"
        />
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || updateConfig.isPending}
        >
          {updateConfig.isPending ? (
            <Loader2 className="size-3.5 mr-1.5 animate-spin" />
          ) : (
            <Save className="size-3.5 mr-1.5" />
          )}
          Save Ban List
        </Button>
      </CardContent>
    </Card>
  );
}
