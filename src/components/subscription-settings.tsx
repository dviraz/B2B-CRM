'use client';

import { useState, useEffect } from 'react';
import {
  CreditCard,
  Crown,
  Package,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ExternalLink,
  Calendar,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { CompanyStatus, PlanTier, ServiceStatus, BillingCycle } from '@/types';

interface SubscriptionData {
  company: {
    id: string;
    name: string;
    status: CompanyStatus;
    plan_tier: PlanTier;
    max_active_limit: number;
    woo_customer_id: string | null;
    created_at: string;
  };
  services: Array<{
    id: string;
    service_name: string;
    service_type: 'subscription' | 'one_time';
    status: ServiceStatus;
    price: number | null;
    billing_cycle: BillingCycle | null;
    start_date: string | null;
    renewal_date: string | null;
  }>;
  usage: {
    total_requests: number;
    active_requests: number;
    completed_requests: number;
    queued_requests: number;
    max_active_limit: number;
  };
}

const planFeatures: Record<PlanTier, string[]> = {
  standard: [
    '1 active request at a time',
    'Unlimited total requests',
    'Async communication',
    'File uploads up to 50MB',
    'Standard support',
  ],
  pro: [
    '2 active requests at a time',
    'Unlimited total requests',
    'Async communication',
    'File uploads up to 100MB',
    'Priority support',
    'Faster turnaround',
  ],
};

const statusColors: Record<CompanyStatus, string> = {
  active: 'bg-green-500/10 text-green-600 border-green-200',
  paused: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  churned: 'bg-red-500/10 text-red-600 border-red-200',
};

const serviceStatusColors: Record<ServiceStatus, string> = {
  active: 'bg-green-500/10 text-green-600',
  paused: 'bg-yellow-500/10 text-yellow-600',
  cancelled: 'bg-red-500/10 text-red-600',
  completed: 'bg-blue-500/10 text-blue-600',
  pending: 'bg-gray-500/10 text-gray-600',
};

export function SubscriptionSettings() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch('/api/subscription');
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        toast.error('Failed to load subscription data');
      }
    } catch {
      toast.error('Failed to load subscription data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPrice = (price: number | null, cycle: BillingCycle | null) => {
    if (price === null) return 'Contact for pricing';
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
    if (cycle === 'one_time') return `${formatted} (one-time)`;
    return `${formatted}/${cycle === 'yearly' ? 'year' : cycle === 'quarterly' ? 'quarter' : 'month'}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Unable to load subscription data
        </CardContent>
      </Card>
    );
  }

  const usagePercent = data.usage.max_active_limit > 0
    ? (data.usage.active_requests / data.usage.max_active_limit) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-indigo-500" />
                Current Plan
              </CardTitle>
              <CardDescription>
                Your subscription details and plan features
              </CardDescription>
            </div>
            <Badge className={`${statusColors[data.company.status]} border`}>
              {data.company.status === 'active' && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {data.company.status === 'paused' && <Clock className="h-3 w-3 mr-1" />}
              {data.company.status === 'churned' && <AlertCircle className="h-3 w-3 mr-1" />}
              {data.company.status.charAt(0).toUpperCase() + data.company.status.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Tier */}
          <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900">
            <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
              <Zap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg capitalize">
                {data.company.plan_tier} Plan
              </h3>
              <p className="text-sm text-muted-foreground">
                Up to {data.company.max_active_limit} active request{data.company.max_active_limit !== 1 ? 's' : ''} at a time
              </p>
            </div>
            {data.company.plan_tier === 'standard' && (
              <Button variant="outline" disabled>
                Upgrade to Pro
              </Button>
            )}
          </div>

          {/* Plan Features */}
          <div>
            <h4 className="text-sm font-medium mb-3">Plan Features</h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {planFeatures[data.company.plan_tier].map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Member Since */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Member since {formatDate(data.company.created_at)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Usage Overview
          </CardTitle>
          <CardDescription>
            Your request activity and usage statistics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active Slots */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Active Request Slots</span>
              <span className="text-sm text-muted-foreground">
                {data.usage.active_requests} / {data.usage.max_active_limit}
              </span>
            </div>
            <Progress
              value={usagePercent}
              className="h-2"
            />
            {usagePercent >= 100 && (
              <p className="text-xs text-amber-600 mt-1">
                All slots in use. Complete requests to free up slots.
              </p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">{data.usage.total_requests}</p>
              <p className="text-xs text-muted-foreground">Total Requests</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{data.usage.queued_requests}</p>
              <p className="text-xs text-muted-foreground">In Queue</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{data.usage.active_requests}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{data.usage.completed_requests}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Services Card */}
      {data.services.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Active Services
            </CardTitle>
            <CardDescription>
              Services and subscriptions linked to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      {service.service_type === 'subscription' ? (
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{service.service_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(service.price, service.billing_cycle)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={serviceStatusColors[service.status]}>
                      {service.status}
                    </Badge>
                    {service.renewal_date && service.status === 'active' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Renews {formatDate(service.renewal_date)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Portal Link */}
      {data.company.woo_customer_id && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing & Invoices
            </CardTitle>
            <CardDescription>
              Manage your billing information and view invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Access your billing portal to update payment methods, view invoices, and manage your subscription.
            </p>
            <Button variant="outline" disabled>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Billing Portal
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Contact support to access your billing portal
            </p>
          </CardContent>
        </Card>
      )}

      {/* Status Alerts */}
      {data.company.status === 'paused' && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Clock className="h-6 w-6 text-yellow-600 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                  Subscription Paused
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Your subscription is currently paused. You can view existing requests but cannot create new ones or add comments. Contact support to resume your subscription.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {data.company.status === 'churned' && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-800 dark:text-red-200">
                  Subscription Ended
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Your subscription has ended. Please renew to continue using the platform and access all features.
                </p>
                <Button className="mt-3" variant="outline" disabled>
                  Renew Subscription
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
