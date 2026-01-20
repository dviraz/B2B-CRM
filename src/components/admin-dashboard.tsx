'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, ArrowRight, DollarSign, Users, Pause, TrendingUp, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WooCommerceSync } from '@/components/woocommerce-sync';
import type { CompanyWithStats } from '@/types';

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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of all clients and their requests
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Total Clients */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Clients
            </CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{companies.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All registered clients
            </p>
          </CardContent>
        </Card>

        {/* Active Clients */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Clients
            </CardTitle>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {activeCompanies.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently subscribed
            </p>
          </CardContent>
        </Card>

        {/* Paused/Churned */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paused/Churned
            </CardTitle>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Pause className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {pausedCompanies.length + churnedCompanies.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pausedCompanies.length} paused, {churnedCompanies.length} churned
            </p>
          </CardContent>
        </Card>

        {/* Active Requests */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Requests
            </CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Briefcase className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalActiveRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently in progress
            </p>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="shadow-card hover:shadow-card-hover transition-shadow bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Revenue
            </CardTitle>
            <div className="p-2 bg-primary/20 rounded-lg">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {totalMrr !== null
                ? new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(totalMrr)
                : '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              MRR from subscriptions
            </p>
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
