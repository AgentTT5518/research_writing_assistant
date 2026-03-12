'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useAiUsage } from '../hooks';

const FEATURE_COLORS: Record<string, string> = {
  research: 'bg-blue-100 text-blue-800',
  write: 'bg-purple-100 text-purple-800',
  review: 'bg-orange-100 text-orange-800',
  adapt: 'bg-green-100 text-green-800',
};

function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export function AiUsageDashboard() {
  const { data, isLoading } = useAiUsage();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const usage = data?.usage ?? [];
  const totals = data?.totals ?? {
    totalRequests: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalCostUsd: 0,
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Requests</p>
            <p className="text-2xl font-bold">{totals.totalRequests}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Tokens</p>
            <p className="text-2xl font-bold">
              {formatTokens(totals.totalPromptTokens + totals.totalCompletionTokens)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Estimated Cost</p>
            <p className="text-2xl font-bold">{formatCost(totals.totalCostUsd)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Usage by Feature & Month</CardTitle>
        </CardHeader>
        <CardContent>
          {usage.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No AI usage data yet. Usage will appear here after research or writing operations.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.map((row, i) => (
                  <TableRow key={`${row.month}-${row.feature}-${i}`}>
                    <TableCell className="font-mono text-sm">{row.month}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={FEATURE_COLORS[row.feature] ?? ''}
                      >
                        {row.feature}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{row.totalRequests}</TableCell>
                    <TableCell className="text-right">
                      {formatTokens(row.totalPromptTokens + row.totalCompletionTokens)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCost(row.totalCostUsd)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
