'use client';

import { useState, useMemo } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KanbanBoard } from '@/components/kanban';
import { NewRequestDialog } from '@/components/new-request-dialog';
import { RequestDetailDialog } from '@/components/request-detail-dialog';
import { SearchBar } from '@/components/search-bar';
import { cn } from '@/lib/utils';
import type { Company, Request, RequestStatus } from '@/types';

interface ClientDashboardProps {
  company: Company;
  requests: Request[];
  activeCount: number;
}

export function ClientDashboard({
  company,
  requests: initialRequests,
  activeCount: initialActiveCount,
}: ClientDashboardProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [activeCount, setActiveCount] = useState(initialActiveCount);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter requests based on search
  const filteredRequests = useMemo(() => {
    if (!searchQuery) return requests;
    const query = searchQuery.toLowerCase();
    return requests.filter(
      (request) =>
        request.title.toLowerCase().includes(query) ||
        (request.description?.toLowerCase().includes(query) ?? false)
    );
  }, [requests, searchQuery]);

  const handleMoveRequest = async (requestId: string, newStatus: RequestStatus) => {
    const response = await fetch(`/api/requests/${requestId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to move request');
    }

    const updatedRequest = await response.json();

    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? updatedRequest : r))
    );

    // Update active count
    const newActiveCount = requests.filter(
      (r) => (r.id === requestId ? newStatus : r.status) === 'active'
    ).length;
    setActiveCount(newActiveCount);
  };

  const handleNewRequest = async (data: {
    title: string;
    description?: string;
    priority: string;
    assets_link?: string;
    video_brief?: string;
    due_date?: string;
  }) => {
    const response = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create request');
    }

    const newRequest = await response.json();
    setRequests((prev) => [newRequest, ...prev]);
    setIsNewRequestOpen(false);
  };

  const isAtLimit = activeCount >= company.max_active_limit;

  return (
    <div className="space-y-6">
      {/* Hero Header with Gradient Background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-background p-6 sm:p-8 animate-fade-in">
        {/* Decorative Blur Orbs */}
        <div className="absolute top-0 right-0 w-64 h-64 blur-orb blur-orb-primary -translate-y-1/2 translate-x-1/2 opacity-60" />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 blur-orb blur-orb-purple translate-y-1/2 opacity-40" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-indigo-400/10 rounded-full blur-[60px]" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="animate-slide-up opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Your Requests
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your design requests and track progress
            </p>
          </div>

          <div className="flex items-center gap-4 animate-slide-up opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
            {/* Active Count with Glow */}
            <div className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl transition-all',
              isAtLimit
                ? 'bg-destructive/10 ring-1 ring-destructive/30'
                : 'bg-card/50 backdrop-blur-sm ring-1 ring-border/50'
            )}>
              <span className="text-sm text-muted-foreground">Active:</span>
              <span className={cn(
                'font-bold tabular-nums',
                isAtLimit ? 'text-destructive' : 'text-foreground'
              )}>
                {activeCount}
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">{company.max_active_limit}</span>
              {isAtLimit && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  At limit
                </Badge>
              )}
            </div>

            {/* Glassmorphism New Request Button */}
            <Button
              onClick={() => setIsNewRequestOpen(true)}
              className={cn(
                'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600',
                'text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30',
                'transition-all hover:-translate-y-0.5 active:translate-y-0',
                'border-0'
              )}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Request
              <Sparkles className="h-3 w-3 ml-1 opacity-70" />
            </Button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search your requests..."
        className="max-w-sm"
      />

      {/* Status Banner for paused/churned */}
      {company.status !== 'active' && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive font-medium">
            {company.status === 'paused'
              ? 'Your subscription is paused. You can view your requests but cannot create new ones or add comments.'
              : 'Your subscription has ended. Please renew to continue using AgencyOS.'}
          </p>
        </div>
      )}

      {/* Kanban Board */}
      <KanbanBoard
        requests={filteredRequests}
        isAdmin={false}
        companyMaxActive={company.max_active_limit}
        onMoveRequest={handleMoveRequest}
        onRequestClick={setSelectedRequest}
      />

      {/* New Request Dialog */}
      <NewRequestDialog
        open={isNewRequestOpen}
        onOpenChange={setIsNewRequestOpen}
        onSubmit={handleNewRequest}
        disabled={company.status !== 'active'}
      />

      {/* Request Detail Dialog */}
      <RequestDetailDialog
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        isAdmin={false}
      />
    </div>
  );
}
