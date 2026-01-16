'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface SlaComplianceProps {
  data: {
    onTrack: number;
    atRisk: number;
    breached: number;
    total: number;
  };
}

export function SlaCompliance({ data }: SlaComplianceProps) {
  const { onTrack, atRisk, breached, total } = data;

  const onTrackPercent = total > 0 ? Math.round((onTrack / total) * 100) : 0;
  const atRiskPercent = total > 0 ? Math.round((atRisk / total) * 100) : 0;
  const breachedPercent = total > 0 ? Math.round((breached / total) * 100) : 0;

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>SLA Compliance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {total === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No SLA data available
          </div>
        ) : (
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-600">On Track</span>
                <span className="text-sm text-muted-foreground">
                  {onTrack} ({onTrackPercent}%)
                </span>
              </div>
              <Progress value={onTrackPercent} className="h-2 bg-muted [&>div]:bg-green-500" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-yellow-600">At Risk</span>
                <span className="text-sm text-muted-foreground">
                  {atRisk} ({atRiskPercent}%)
                </span>
              </div>
              <Progress value={atRiskPercent} className="h-2 bg-muted [&>div]:bg-yellow-500" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-600">Breached</span>
                <span className="text-sm text-muted-foreground">
                  {breached} ({breachedPercent}%)
                </span>
              </div>
              <Progress value={breachedPercent} className="h-2 bg-muted [&>div]:bg-red-500" />
            </div>

            <div className="pt-4 border-t">
              <div className="text-2xl font-bold text-green-600">
                {100 - breachedPercent}%
              </div>
              <p className="text-xs text-muted-foreground">Overall SLA compliance rate</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
