
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2, RefreshCw, Settings, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { WooCommerceSyncDialog } from "./WooCommerceSyncDialog";

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  products_processed: number;
  products_created: number;
  products_updated: number;
  products_failed: number;
  categories_processed: number;
  orders_processed: number;
  orders_created: number;
  orders_updated: number;
  orders_failed: number;
  customers_processed: number;
  customers_created: number;
  customers_updated: number;
  customers_failed: number;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
}

interface SyncSettings {
  id: string;
  store_url: string;
  sync_direction: string;
  auto_sync_enabled: boolean;
  sync_frequency: string;
  last_sync_at: string;
  is_active: boolean;
}

export function WooCommerceSyncStatus() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useUserRole();
  const [settings, setSettings] = useState<SyncSettings | null>(null);
  const [recentLogs, setRecentLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('woocommerce_sync_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      if (!settingsError && settingsData) {
        setSettings(settingsData);
      }

      // Load recent sync logs
      const { data: logsData, error: logsError } = await supabase
        .from('woocommerce_sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(5);

      if (!logsError && logsData) {
        setRecentLogs(logsData);
      }
    } catch (error) {
      console.error('Error loading sync data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (syncType: 'full' | 'incremental') => {
    if (!settings) {
      toast({
        title: "Error",
        description: "Please configure WooCommerce settings first",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('wc-sync', {
        body: {
          action: syncType === 'full' ? 'full-sync' : 'incremental-sync',
          settingsId: settings.id
        }
      });

      if (error) {
        throw new Error(error.message || 'Unknown error occurred');
      }

      if (data?.success === false) {
        throw new Error(data.error || 'Sync failed');
      }

      const stats = data?.stats || {};
      const messages = [];
      
      if (stats.productsCreated || stats.productsUpdated || stats.productsFailed) {
        messages.push(`Products: ${stats.productsCreated || 0} created, ${stats.productsUpdated || 0} updated${
          stats.productsFailed > 0 ? `, ${stats.productsFailed} failed` : ''
        }`);
      }
      
      if (stats.ordersCreated || stats.ordersUpdated || stats.ordersFailed) {
        messages.push(`Orders: ${stats.ordersCreated || 0} created, ${stats.ordersUpdated || 0} updated${
          stats.ordersFailed > 0 ? `, ${stats.ordersFailed} failed` : ''
        }`);
      }
      
      if (stats.customersCreated || stats.customersUpdated || stats.customersFailed) {
        messages.push(`Customers: ${stats.customersCreated || 0} created, ${stats.customersUpdated || 0} updated${
          stats.customersFailed > 0 ? `, ${stats.customersFailed} failed` : ''
        }`);
      }

      const statsMessage = messages.length > 0 ? messages.join('. ') : 'No items processed';

      toast({
        title: "Sync Completed",
        description: `${data?.message || "Sync completed successfully"}. ${statsMessage}`,
      });

      // Reload data to show updated logs
      loadData();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync with WooCommerce. Please check your settings and try again.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'partial':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (authLoading || loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="ml-2">Loading...</span>
        </CardContent>
      </Card>
    );
  }

  // Show authentication required message
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            WooCommerce Sync
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Authentication Required</p>
              <p className="text-sm text-yellow-600">Please log in as an administrator to access WooCommerce sync.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show access denied for non-admin users
  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            WooCommerce Sync
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Access Denied</p>
              <p className="text-sm text-red-600">Only administrators can access WooCommerce sync settings.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                WooCommerce Sync
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!settings ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  WooCommerce sync is not configured yet.
                </p>
                <Button onClick={() => setShowSettings(true)}>
                  Configure WooCommerce Sync
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Store URL</p>
                    <p className="font-medium truncate" title={settings.store_url}>
                      {settings.store_url}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last Sync</p>
                    <p className="font-medium">
                      {settings.last_sync_at 
                        ? new Date(settings.last_sync_at).toLocaleString()
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-600">Sync Direction</p>
                    <p className="font-medium capitalize">
                      {settings.sync_direction?.replace('_', ' → ') || 'WooCommerce → Local'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Auto Sync</p>
                    <p className="font-medium">
                      {settings.auto_sync_enabled ? `${settings.sync_frequency || 'Manual'}` : 'Disabled'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSync('incremental')}
                    disabled={syncing}
                    variant="outline"
                  >
                    {syncing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Quick Sync
                  </Button>
                  <Button
                    onClick={() => handleSync('full')}
                    disabled={syncing}
                  >
                    {syncing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Full Sync
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {recentLogs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Sync History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(log.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{log.sync_type} Sync</span>
                          <Badge className={getStatusColor(log.status)}>
                            {log.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          {new Date(log.started_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm space-y-1">
                      {(log.products_created || log.products_updated || log.products_failed) && (
                        <p>
                          Products: {log.products_created || 0} created, {log.products_updated || 0} updated
                          {log.products_failed > 0 && <span className="text-red-600">, {log.products_failed} failed</span>}
                        </p>
                      )}
                      {(log.orders_created || log.orders_updated || log.orders_failed) && (
                        <p>
                          Orders: {log.orders_created || 0} created, {log.orders_updated || 0} updated
                          {log.orders_failed > 0 && <span className="text-red-600">, {log.orders_failed} failed</span>}
                        </p>
                      )}
                      {(log.customers_created || log.customers_updated || log.customers_failed) && (
                        <p>
                          Customers: {log.customers_created || 0} created, {log.customers_updated || 0} updated
                          {log.customers_failed > 0 && <span className="text-red-600">, {log.customers_failed} failed</span>}
                        </p>
                      )}
                      {log.duration_seconds && (
                        <p className="text-gray-500">{log.duration_seconds}s</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <WooCommerceSyncDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        settings={settings}
        onSuccess={loadData}
      />
    </>
  );
}
