
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
      const { data, error } = await supabase.functions.invoke('woocommerce-sync', {
        body: {
          action: syncType === 'full' ? 'full-sync' : 'incremental-sync',
          settingsId: settings.id
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message || "Sync completed successfully",
      });

      // Reload data to show updated logs
      loadData();
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync with WooCommerce",
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin" />
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
                    <p className="font-medium">{settings.store_url}</p>
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
                    <div className="text-right text-sm">
                      <p>
                        {log.products_created} created, {log.products_updated} updated
                      </p>
                      {log.products_failed > 0 && (
                        <p className="text-red-600">{log.products_failed} failed</p>
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
