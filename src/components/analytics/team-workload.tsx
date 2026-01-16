'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TeamWorkloadProps {
  data: Array<{
    id: string;
    name: string;
    total: number;
    active: number;
    completed: number;
  }>;
}

export function TeamWorkload({ data }: TeamWorkloadProps) {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Team Workload</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No team data available
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-2 shadow-lg">
                          <p className="text-sm font-medium">{data.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Active: {data.active}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Completed: {data.completed}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Total: {data.total}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar
                  dataKey="active"
                  name="Active"
                  fill="#3b82f6"
                  stackId="stack"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="completed"
                  name="Completed"
                  fill="#22c55e"
                  stackId="stack"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
