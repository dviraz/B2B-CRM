'use client';

import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KanbanBoard } from '@/components/kanban';
import { NewRequestDialog } from '@/components/new-request-dialog';
import { RequestDetailDialog } from '@/components/request-detail-dialog';
import { SearchBar } from '@/components/search-bar';
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Your Requests</h1>
          <p className="text-muted-foreground">
            Manage your design requests and track progress
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Active:</span>
            <Badge variant={isAtLimit ? 'destructive' : 'secondary'}>
              {activeCount}/{company.max_active_limit}
            </Badge>
          </div>

          <Button onClick={() => setIsNewRequestOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
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
