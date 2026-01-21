'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Building2, ArrowRight, DollarSign, Users, Pause, TrendingUp, Briefcase, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WooCommerceSync } from '@/components/woocommerce-sync';
import { cn } from '@/lib/utils';
import type { CompanyWithStats } from '@/types';

// Animated counter component
function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  duration = 1000,
  className = ''
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * easeOut);

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    previousValue.current = value;
  }, [value, duration]);

  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
}

export function AdminDashboard() {
  const [companies, setCompanies] = useState<CompanyWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalMrr, setTotalMrr] = useState<number | null>(null);

  useEffect(() => {
    async function fetchCompanies() {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
      setIsLoading(false);
    }

    async function fetchMrr() {
      try {
        const response = await fetch('/api/analytics/mrr');
        if (response.ok) {
          const data = await response.json();
          setTotalMrr(data.total_mrr);
        }
      } catch {
        // MRR endpoint might not exist yet
      }
    }

    fetchCompanies();
    fetchMrr();
  }, []);

  const activeCompanies = companies.filter((c) => c.status === 'active');
  const pausedCompanies = companies.filter((c) => c.status === 'paused');
  const churnedCompanies = companies.filter((c) => c.status === 'churned');

  const totalActiveRequests = companies.reduce(
    (acc, c) => acc + c.active_request_count,
    0
  );

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        {/* Loading Header */}
        <div className="flex flex-col gap-1">
          <div className="h-8 w-48 rounded-lg animate-shimmer" />
          <div className="h-4 w-72 rounded animate-shimmer" />
        </div>

        {/* Loading Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="shadow-card overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="h-4 w-24 rounded animate-shimmer" />
                <div className="h-8 w-8 rounded-lg animate-shimmer" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 rounded animate-shimmer mb-2" />
                <div className="h-3 w-28 rounded animate-shimmer" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1 animate-fade-in">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of all clients and their requests
        </p>
      </div>

      {/* Stats Cards with Gradients and Animations */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Total Clients */}
        <Card className="relative overflow-hidden shadow-card hover:shadow-card-hover transition-all hover-lift animate-slide-up opacity-0 animate-stagger-1 group">
          <div className="absolute top-0 right-0 w-24 h-24 blur-orb blur-orb-primary -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Clients
            </CardTitle>
            <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/10 rounded-xl group-hover:scale-110 transition-transform">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold animate-count-up">
              <AnimatedCounter value={companies.length} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All registered clients
            </p>
          </CardContent>
        </Card>

        {/* Active Clients */}
        <Card className="relative overflow-hidden shadow-card hover:shadow-card-hover transition-all hover-lift animate-slide-up opacity-0 animate-stagger-2 group border-l-4 border-l-emerald-500">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-[40px] -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Clients
            </CardTitle>
            <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-green-500/10 rounded-xl group-hover:scale-110 transition-transform">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              <AnimatedCounter value={activeCompanies.length} />
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <ArrowUpRight className="h-3 w-3" />
                {companies.length > 0 ? Math.round((activeCompanies.length / companies.length) * 100) : 0}%
              </span>
              <span className="text-xs text-muted-foreground">of total</span>
            </div>
          </CardContent>
        </Card>

        {/* Paused/Churned */}
        <Card className="relative overflow-hidden shadow-card hover:shadow-card-hover transition-all hover-lift animate-slide-up opacity-0 animate-stagger-3 group border-l-4 border-l-amber-500">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 blur-[40px] -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paused/Churned
            </CardTitle>
            <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-xl group-hover:scale-110 transition-transform">
              <Pause className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              <AnimatedCounter value={pausedCompanies.length + churnedCompanies.length} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-amber-600 dark:text-amber-400">{pausedCompanies.length}</span> paused, <span className="text-rose-600 dark:text-rose-400">{churnedCompanies.length}</span> churned
            </p>
          </CardContent>
        </Card>

        {/* Active Requests */}
        <Card className="relative overflow-hidden shadow-card hover:shadow-card-hover transition-all hover-lift animate-slide-up opacity-0 animate-stagger-4 group">
          <div className="absolute top-0 right-0 w-24 h-24 blur-orb blur-orb-purple -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Requests
            </CardTitle>
            <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/10 rounded-xl group-hover:scale-110 transition-transform">
              <Briefcase className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold">
              <AnimatedCounter value={totalActiveRequests} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently in progress
            </p>
          </CardContent>
        </Card>

        {/* Monthly Revenue - Premium Card */}
        <Card className="relative overflow-hidden shadow-card hover:shadow-card-hover transition-all hover-lift animate-slide-up opacity-0 animate-stagger-5 group bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-background border-indigo-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 blur-orb blur-orb-primary -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 blur-orb blur-orb-purple translate-y-1/2 -translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Revenue
            </CardTitle>
            <div className="p-2.5 bg-gradient-to-br from-indigo-500/30 to-purple-500/20 rounded-xl group-hover:scale-110 transition-transform animate-pulse-subtle">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-gradient-primary">
              {totalMrr !== null ? (
                <AnimatedCounter
                  value={totalMrr}
                  prefix="$"
                  duration={1500}
                />
              ) : (
                '-'
              )}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-muted-foreground">MRR from subscriptions</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Companies List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold tracking-tight">All Clients</h2>
          <Badge variant="secondary" className="font-normal">
            {companies.length} total
          </Badge>
        </div>
        <div className="space-y-3">
          {companies.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="py-12 text-center">
                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">No clients yet</h3>
                <p className="text-muted-foreground text-sm">
                  Clients are automatically created when they purchase a subscription through WooCommerce.
                </p>
              </CardContent>
            </Card>
          ) : (
            companies.map((company) => (
              <Card
                key={company.id}
                className="shadow-card hover:shadow-card-hover transition-all hover:translate-y-[-1px] group"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl group-hover:from-primary/15 group-hover:to-primary/10 transition-colors">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {company.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge
                            className={
                              company.status === 'active'
                                ? 'badge-success'
                                : company.status === 'paused'
                                ? 'badge-warning'
                                : 'badge-danger'
                            }
                          >
                            {company.status}
                          </Badge>
                          <Badge variant="outline" className="font-normal">
                            {company.plan_tier}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Active Requests
                        </p>
                        <p className="font-semibold text-lg">
                          <span className={company.active_request_count >= company.max_active_limit ? 'text-amber-600' : ''}>
                            {company.active_request_count}
                          </span>
                          <span className="text-muted-foreground font-normal">/{company.max_active_limit}</span>
                        </p>
                      </div>

                      <Link href={`/dashboard/admin/${company.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                        >
                          View Board
                          <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* WooCommerce Sync */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold tracking-tight">WooCommerce Integration</h2>
        </div>
        <WooCommerceSync />
      </div>
    </div>
  );
}
