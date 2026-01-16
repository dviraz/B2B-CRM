'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  FileEdit,
  Plus,
  Trash2,
  ArrowRight,
  User,
  Filter,
  Download,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { AuditAction } from '@/types';

interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: AuditAction;
  changes: Record<string, unknown> | null;
  performed_by: string;
  performed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  performer?: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

interface AuditLogViewerProps {
  entityType?: string;
  entityId?: string;
  limit?: number;
  showFilters?: boolean;
}

const actionIcons: Record<AuditAction, React.ReactNode> = {
  create: <Plus className="h-4 w-4 text-green-600" />,
  update: <FileEdit className="h-4 w-4 text-blue-600" />,
  delete: <Trash2 className="h-4 w-4 text-red-600" />,
  status_change: <ArrowRight className="h-4 w-4 text-purple-600" />,
  assign: <User className="h-4 w-4 text-indigo-600" />,
  comment: <FileEdit className="h-4 w-4 text-teal-600" />,
};

const actionLabels: Record<AuditAction, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  status_change: 'Status Changed',
  assign: 'Assigned',
  comment: 'Commented',
};

const actionColors: Record<AuditAction, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  status_change: 'bg-purple-100 text-purple-700',
  assign: 'bg-indigo-100 text-indigo-700',
  comment: 'bg-teal-100 text-teal-700',
};

export function AuditLogViewer({
  entityType,
  entityId,
  limit = 50,
  showFilters = true,
}: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntityType, setFilterEntityType] = useState<string>(entityType || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (entityType) params.append('entity_type', entityType);
        if (entityId) params.append('entity_id', entityId);
        params.append('limit', limit.toString());
        if (filterAction !== 'all') params.append('action', filterAction);
        if (filterEntityType !== 'all' && !entityType) {
          params.append('entity_type', filterEntityType);
        }

        const response = await fetch(`/api/audit-logs?${params}`);
        if (response.ok) {
          const data = await response.json();
          setLogs(data);
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [entityType, entityId, limit, filterAction, filterEntityType]);

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.entity_type.toLowerCase().includes(query) ||
      log.entity_id.toLowerCase().includes(query) ||
      log.performer?.email.toLowerCase().includes(query) ||
      log.performer?.full_name?.toLowerCase().includes(query)
    );
  });

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Entity Type', 'Entity ID', 'Action', 'User', 'IP Address'].join(','),
      ...filteredLogs.map((log) =>
        [
          log.performed_at,
          log.entity_type,
          log.entity_id,
          log.action,
          log.performer?.email || log.performed_by,
          log.ip_address || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderChanges = (changes: Record<string, unknown> | null) => {
    if (!changes) return null;

    return (
      <div className="mt-2 p-3 bg-muted rounded-md text-sm">
        <pre className="overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(changes, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filters:</span>
          </div>

          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48"
          />

          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="create">Created</SelectItem>
              <SelectItem value="update">Updated</SelectItem>
              <SelectItem value="delete">Deleted</SelectItem>
              <SelectItem value="status_change">Status Change</SelectItem>
            </SelectContent>
          </Select>

          {!entityType && (
            <Select value={filterEntityType} onValueChange={setFilterEntityType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="request">Requests</SelectItem>
                <SelectItem value="company">Companies</SelectItem>
                <SelectItem value="profile">Users</SelectItem>
                <SelectItem value="comment">Comments</SelectItem>
                <SelectItem value="file">Files</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      )}

      {/* Logs List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No audit logs found
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => (
            <Collapsible
              key={log.id}
              open={expandedLog === log.id}
              onOpenChange={() =>
                setExpandedLog(expandedLog === log.id ? null : log.id)
              }
            >
              <div className="border rounded-lg">
                <CollapsibleTrigger asChild>
                  <button className="w-full p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left">
                    <div className="flex-shrink-0">
                      {actionIcons[log.action]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={actionColors[log.action]}>
                          {actionLabels[log.action]}
                        </Badge>
                        <Badge variant="outline">{log.entity_type}</Badge>
                        <span className="text-sm text-muted-foreground truncate">
                          {log.entity_id}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>
                          {log.performer?.full_name || log.performer?.email || 'Unknown'}
                        </span>
                        <span>&middot;</span>
                        <span>
                          {formatDistanceToNow(new Date(log.performed_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {expandedLog === log.id ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-3 pb-3 border-t">
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-muted-foreground">Entity ID:</span>{' '}
                          <code className="bg-muted px-1 rounded">{log.entity_id}</code>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Timestamp:</span>{' '}
                          {new Date(log.performed_at).toLocaleString()}
                        </div>
                        {log.ip_address && (
                          <div>
                            <span className="text-muted-foreground">IP Address:</span>{' '}
                            {log.ip_address}
                          </div>
                        )}
                        {log.user_agent && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">User Agent:</span>{' '}
                            <span className="text-xs">{log.user_agent}</span>
                          </div>
                        )}
                      </div>

                      {log.changes && (
                        <div>
                          <span className="text-muted-foreground">Changes:</span>
                          {renderChanges(log.changes)}
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}
