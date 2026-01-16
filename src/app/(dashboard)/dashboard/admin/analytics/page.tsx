'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MetricsCards,
  RequestVolumeChart,
  StatusDistribution,
  SlaCompliance,
  TeamWorkload,
} from '@/components/analytics';

interface AnalyticsData {
  overview: {
    total: number;
    completed: number;
    active: number;
    avgCompletionTime: number;
  };
  statusDistribution: Array<{ name: string; value: number }>;
  priorityDistribution: Array<{ name: string; value: number }>;
  requestVolume: Array<{ date: string; count: number }>;
  slaCompliance: {
    onTrack: number;
    atRisk: number;
    breached: number;
    total: number;
  };
  teamWorkload: Array<{
    id: string;
    name: string;
    total: number;
    active: number;
    completed: number;
  }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/analytics?days=${timeRange}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/dashboard/admin">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Track performance and gain insights
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={fetchAnalytics} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Overview Metrics */}
          <MetricsCards overview={data.overview} />

          {/* Charts Grid */}
          <div className="grid gap-4 md:grid-cols-4">
            <RequestVolumeChart data={data.requestVolume} />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <StatusDistribution data={data.statusDistribution} />
            <SlaCompliance data={data.slaCompliance} />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <TeamWorkload data={data.teamWorkload} />
          </div>
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          Failed to load analytics data
        </div>
      )}
    </div>
  );
}
