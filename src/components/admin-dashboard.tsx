'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, ArrowRight, DollarSign } from 'lucide-react';
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
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of all clients and their requests
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeCompanies.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paused/Churned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {pausedCompanies.length + churnedCompanies.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActiveRequests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalMrr !== null ? `$${totalMrr.toFixed(2)}` : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Companies List */}
      <div>
        <h2 className="text-lg font-semibold mb-4">All Clients</h2>
        <div className="space-y-2">
          {companies.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No clients yet. Clients are automatically created when they
                purchase a subscription through WooCommerce.
              </CardContent>
            </Card>
          ) : (
            companies.map((company) => (
              <Card key={company.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-medium">{company.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={
                              company.status === 'active'
                                ? 'default'
                                : company.status === 'paused'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {company.status}
                          </Badge>
                          <Badge variant="outline">{company.plan_tier}</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          Active Requests
                        </p>
                        <p className="font-medium">
                          {company.active_request_count}/{company.max_active_limit}
                        </p>
                      </div>

                      <Link href={`/dashboard/admin/${company.id}`}>
                        <Button variant="ghost" size="sm">
                          View Board
                          <ArrowRight className="h-4 w-4 ml-2" />
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
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">WooCommerce Integration</h2>
        <WooCommerceSync />
      </div>
    </div>
  );
}
