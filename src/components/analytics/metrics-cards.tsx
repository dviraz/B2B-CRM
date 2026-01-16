'use client';

import { BarChart3, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricsCardsProps {
  overview: {
    total: number;
    completed: number;
    active: number;
    avgCompletionTime: number;
  };
}

export function MetricsCards({ overview }: MetricsCardsProps) {
  const completionRate = overview.total > 0
    ? Math.round((overview.completed / overview.total) * 100)
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overview.total}</div>
          <p className="text-xs text-muted-foreground">In the selected period</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overview.completed}</div>
          <p className="text-xs text-muted-foreground">{completionRate}% completion rate</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active</CardTitle>
          <Loader2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overview.active}</div>
          <p className="text-xs text-muted-foreground">Currently in progress</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Completion Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {overview.avgCompletionTime > 24
              ? `${Math.round(overview.avgCompletionTime / 24)}d`
              : `${overview.avgCompletionTime}h`}
          </div>
          <p className="text-xs text-muted-foreground">Average turnaround</p>
        </CardContent>
      </Card>
    </div>
  );
}
