'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, LayoutGrid, Users, Package, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KanbanBoard } from '@/components/kanban';
import { NewRequestDialog } from '@/components/new-request-dialog';
import { RequestDetailDialog } from '@/components/request-detail-dialog';
import { SearchBar } from '@/components/search-bar';
import { AdvancedFilters, type FilterValues } from '@/components/advanced-filters';
import { FilterBadges } from '@/components/filter-badges';
import { BulkActionToolbar } from '@/components/bulk-action-toolbar';
import { CompanyDetailsForm } from '@/components/company-details-form';
import { CompanyContacts } from '@/components/company-contacts';
import { CompanyServices } from '@/components/company-services';
import { useBulkSelection } from '@/hooks/use-bulk-selection';
import type { Company, Request, RequestStatus, Priority } from '@/types';

interface AdminCompanyBoardProps {
  company: Company;
  requests: Request[];
  activeCount: number;
}

export function AdminCompanyBoard({
  company: initialCompany,
  requests: initialRequests,
  activeCount: initialActiveCount,
}: AdminCompanyBoardProps) {
  const [company, setCompany] = useState(initialCompany);
  const [requests, setRequests] = useState(initialRequests);
  const [activeCount, setActiveCount] = useState(initialActiveCount);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterValues>({});
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; full_name: string | null; email: string }>>([]);
  const [activeTab, setActiveTab] = useState('requests');

  // Fetch team members for filter dropdown
  useEffect(() => {
    fetch('/api/team-members')
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setTeamMembers(data))
      .catch(() => {});
  }, []);

  // Filter requests based on search and filters
  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          request.title.toLowerCase().includes(query) ||
          (request.description?.toLowerCase().includes(query) ?? false);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(request.status)) return false;
      }

      // Priority filter
      if (filters.priority && filters.priority.length > 0) {
        if (!filters.priority.includes(request.priority)) return false;
      }

      // Assignee filter
      if (filters.assigneeId) {
        if (request.assigned_to !== filters.assigneeId) return false;
      }

      // Date range filters
      if (filters.dateFrom && request.due_date) {
        if (new Date(request.due_date) < filters.dateFrom) return false;
      }
      if (filters.dateTo && request.due_date) {
        if (new Date(request.due_date) > filters.dateTo) return false;
      }

      return true;
    });
  }, [requests, searchQuery, filters]);

  const removeFilter = (key: keyof FilterValues, value?: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      if (key === 'status' && value) {
        newFilters.status = prev.status?.filter((s) => s !== value);
        if (newFilters.status?.length === 0) delete newFilters.status;
      } else if (key === 'priority' && value) {
        newFilters.priority = prev.priority?.filter((p) => p !== value);
        if (newFilters.priority?.length === 0) delete newFilters.priority;
      } else {
        delete newFilters[key];
      }
      return newFilters;
    });
  };

  // Bulk selection
  const {
    selectedIds,
    selectedCount,
    isSelectionMode,
    toggleSelection,
    clearSelection,
    toggleSelectionMode,
    isSelected,
  } = useBulkSelection<Request>();

  const handleBulkStatusChange = async (status: RequestStatus) => {
    const response = await fetch('/api/requests/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_ids: selectedIds,
        action: 'update_status',
        value: status,
      }),
    });

    if (response.ok) {
      setRequests((prev) =>
        prev.map((r) =>
          selectedIds.includes(r.id)
            ? { ...r, status, completed_at: status === 'done' ? new Date().toISOString() : r.completed_at }
            : r
        )
      );
      clearSelection();
    }
  };

  const handleBulkPriorityChange = async (priority: Priority) => {
    const response = await fetch('/api/requests/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_ids: selectedIds,
        action: 'update_priority',
        value: priority,
      }),
    });

    if (response.ok) {
      setRequests((prev) =>
        prev.map((r) =>
          selectedIds.includes(r.id) ? { ...r, priority } : r
        )
      );
      clearSelection();
    }
  };

  const handleBulkAssign = async (userId: string) => {
    const response = await fetch('/api/requests/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_ids: selectedIds,
        action: 'assign',
        value: userId,
      }),
    });

    if (response.ok) {
      const assignee = teamMembers.find((m) => m.id === userId);
      setRequests((prev) =>
        prev.map((r) =>
          selectedIds.includes(r.id)
            ? { ...r, assigned_to: userId, assignee: assignee ? { id: assignee.id, email: assignee.email, full_name: assignee.full_name, avatar_url: null } : undefined }
            : r
        )
      );
      clearSelection();
    }
  };

  const handleBulkDelete = async () => {
    const response = await fetch('/api/requests/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request_ids: selectedIds,
        action: 'delete',
      }),
    });

    if (response.ok) {
      setRequests((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
      clearSelection();
    }
  };

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
      body: JSON.stringify({
        ...data,
        company_id: company.id,
      }),
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
      <div className="flex flex-col gap-4">
        <Link href="/dashboard/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to All Clients
          </Button>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{company.name}</h1>
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
            <p className="text-muted-foreground mt-1">
              Manage requests and details for this client
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Active:</span>
              <Badge variant={isAtLimit ? 'destructive' : 'secondary'}>
                {activeCount}/{company.max_active_limit}
              </Badge>
            </div>

            {activeTab === 'requests' && (
              <Button onClick={() => setIsNewRequestOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Request
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Status Banners */}
      {company.status === 'paused' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            This client&apos;s subscription is paused. They have read-only access.
          </p>
        </div>
      )}

      {company.status === 'churned' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            This client&apos;s subscription has been cancelled.
          </p>
        </div>
      )}

      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Requests</span>
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Details</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Contacts</span>
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Services</span>
          </TabsTrigger>
        </TabsList>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search requests..."
              className="sm:w-64"
            />
            <AdvancedFilters
              filters={filters}
              onFiltersChange={setFilters}
              teamMembers={teamMembers}
            />
            <BulkActionToolbar
              selectedCount={selectedCount}
              isSelectionMode={isSelectionMode}
              onToggleSelectionMode={toggleSelectionMode}
              onClearSelection={clearSelection}
              onBulkStatusChange={handleBulkStatusChange}
              onBulkPriorityChange={handleBulkPriorityChange}
              onBulkAssign={handleBulkAssign}
              onBulkDelete={handleBulkDelete}
              teamMembers={teamMembers}
            />
          </div>

          {/* Active filter badges */}
          <FilterBadges
            filters={filters}
            onRemove={removeFilter}
            teamMembers={teamMembers}
          />

          {/* Kanban Board */}
          <KanbanBoard
            requests={filteredRequests}
            isAdmin={true}
            companyMaxActive={company.max_active_limit}
            onMoveRequest={handleMoveRequest}
            onRequestClick={setSelectedRequest}
            isSelectionMode={isSelectionMode}
            isSelected={isSelected}
            onToggleSelect={toggleSelection}
          />
        </TabsContent>

        {/* Company Details Tab */}
        <TabsContent value="details">
          <CompanyDetailsForm
            company={company}
            isAdmin={true}
            onUpdate={(updatedCompany) => setCompany(updatedCompany)}
          />
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <CompanyContacts companyId={company.id} isAdmin={true} />
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services">
          <CompanyServices companyId={company.id} isAdmin={true} />
        </TabsContent>
      </Tabs>

      {/* New Request Dialog */}
      <NewRequestDialog
        open={isNewRequestOpen}
        onOpenChange={setIsNewRequestOpen}
        onSubmit={handleNewRequest}
      />

      {/* Request Detail Dialog */}
      <RequestDetailDialog
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        isAdmin={true}
        onRequestUpdate={(updatedRequest) => {
          setRequests((prev) =>
            prev.map((r) => (r.id === updatedRequest.id ? updatedRequest : r))
          );
          setSelectedRequest(updatedRequest);
        }}
      />
    </div>
  );
}
