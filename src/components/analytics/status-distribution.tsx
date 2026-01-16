'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatusDistributionProps {
  data: Array<{ name: string; value: number }>;
}

const COLORS = {
  queue: '#94a3b8', // slate
  active: '#3b82f6', // blue
  review: '#eab308', // yellow
  done: '#22c55e', // green
};

const STATUS_LABELS: Record<string, string> = {
  queue: 'Queue',
  active: 'In Progress',
  review: 'In Review',
  done: 'Completed',
};

export function StatusDistribution({ data }: StatusDistributionProps) {
  const filteredData = data.filter((d) => d.value > 0);

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {filteredData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={filteredData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {filteredData.map((entry) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={COLORS[entry.name as keyof typeof COLORS] || '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-2 shadow-lg">
                          <p className="text-sm font-medium">
                            {STATUS_LABELS[data.name] || data.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {data.value} requests
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  formatter={(value: string) => STATUS_LABELS[value] || value}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
