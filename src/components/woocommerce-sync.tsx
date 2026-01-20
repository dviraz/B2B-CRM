'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface SyncInfo {
  woocommerce: {
    subscriptions: number;
    active: number;
    paused: number;
    cancelled: number;
  };
  database: {
    companies: number;
    services: number;
  };
}

interface SyncResult {
  success: boolean;
  companiesCreated: number;
  companiesUpdated: number;
  servicesCreated: number;
  servicesUpdated: number;
  errors: string[];
}

export function WooCommerceSync() {
  const [syncInfo, setSyncInfo] = useState<SyncInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    fetchSyncInfo();
  }, []);

  const fetchSyncInfo = async () => {
    try {
      const response = await fetch('/api/sync/woocommerce');
      if (response.ok) {
        const data = await response.json();
        setSyncInfo(data);
      }
    } catch (error) {
      console.error('Error fetching sync info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setShowConfirm(false);
    setSyncing(true);
    setLastResult(null);

    try {
      const response = await fetch('/api/sync/woocommerce', {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        setLastResult(result);
        toast.success(
          `Sync completed: ${result.companiesCreated} companies created, ${result.servicesCreated} services created`
        );
        // Refresh sync info
        fetchSyncInfo();
      } else {
        toast.error(result.error || 'Sync failed');
        if (result.details) {
          setLastResult(result.details);
        }
      }
    } catch (error) {
      toast.error('An error occurred during sync');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          WooCommerce Sync
        </CardTitle>
        <CardDescription>
          Import and sync subscriptions from WooCommerce
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sync Status */}
        {syncInfo && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">WooCommerce</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Total Subscriptions: <span className="font-medium text-foreground">{syncInfo.woocommerce.subscriptions}</span></p>
                <p>Active: <span className="font-medium text-green-600">{syncInfo.woocommerce.active}</span></p>
                <p>Paused: <span className="font-medium text-yellow-600">{syncInfo.woocommerce.paused}</span></p>
                <p>Cancelled: <span className="font-medium text-red-600">{syncInfo.woocommerce.cancelled}</span></p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Database</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Companies: <span className="font-medium text-foreground">{syncInfo.database.companies}</span></p>
                <p>Services: <span className="font-medium text-foreground">{syncInfo.database.services}</span></p>
              </div>
            </div>
          </div>
        )}

        {/* Last Sync Result */}
        {lastResult && (
          <div className={`p-4 rounded-lg border ${lastResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {lastResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">
                {lastResult.success ? 'Sync Completed' : 'Sync Completed with Errors'}
              </span>
            </div>
            <div className="text-sm space-y-1">
              <p>Companies: {lastResult.companiesCreated} created, {lastResult.companiesUpdated} updated</p>
              <p>Services: {lastResult.servicesCreated} created, {lastResult.servicesUpdated} updated</p>
              {lastResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-red-600 font-medium">Errors ({lastResult.errors.length}):</p>
                  <ul className="list-disc list-inside text-red-600">
                    {lastResult.errors.slice(0, 5).map((error, i) => (
                      <li key={i} className="truncate">{error}</li>
                    ))}
                    {lastResult.errors.length > 5 && (
                      <li>...and {lastResult.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sync Button */}
        <Button
          onClick={() => setShowConfirm(true)}
          disabled={syncing}
          className="w-full"
        >
          {syncing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync from WooCommerce
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          This will fetch all subscriptions from WooCommerce and create/update companies and services.
        </p>

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start WooCommerce Sync?</AlertDialogTitle>
              <AlertDialogDescription>
                This will:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Fetch all subscriptions from WooCommerce</li>
                  <li>Create new companies for new customers</li>
                  <li>Create user accounts (password reset email will be sent)</li>
                  <li>Create/update service records</li>
                </ul>
                <p className="mt-2">
                  Existing records will be updated, not duplicated.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSync}>
                Start Sync
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
