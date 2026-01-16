'use client';

import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AuditLogViewer } from '@/components/audit-log-viewer';

export default function AuditLogsPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <Link href="/dashboard/admin">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Audit Logs</h1>
              <p className="text-muted-foreground">
                Track all system changes and user activities
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Logs Card */}
      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
          <CardDescription>
            View a complete history of all actions performed in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditLogViewer limit={100} showFilters={true} />
        </CardContent>
      </Card>
    </div>
  );
}
