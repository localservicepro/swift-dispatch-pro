import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileSpreadsheet, TestTube, Loader2, CheckCircle, XCircle, LogIn, LogOut } from "lucide-react";

export function GoogleSheetsSettings() {
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("Orders");
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("not_configured");
  const [connectedEmail, setConnectedEmail] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
    // Check URL params for OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_sheets_connected') === 'true') {
      toast({ title: "Google Account Connected!", description: "Your Google account has been linked successfully." });
      window.history.replaceState({}, '', window.location.pathname);
      loadSettings();
    }
    if (params.get('google_sheets_error')) {
      toast({ title: "Connection Failed", description: `Error: ${params.get('google_sheets_error')}`, variant: "destructive" });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('google_sheets_settings')
      .select('*')
      .limit(1)
      .single();
    if (data) {
      setSpreadsheetId(data.spreadsheet_id || "");
      setSheetName(data.sheet_name || "Orders");
      setSyncEnabled(data.sync_enabled ?? true);
      setConnectionStatus(data.connection_status || "not_configured");
      setConnectedEmail(data.service_account_email || "");
      setLastSyncedAt(data.last_synced_at);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('google_sheets_settings')
        .update({
          spreadsheet_id: spreadsheetId,
          sheet_name: sheetName,
          sync_enabled: syncEnabled,
        })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      toast({ title: "Settings Saved", description: "Google Sheets settings updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const connectGoogle = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-auth', {
        body: { action: 'authorize' },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setConnecting(false);
    }
  };

  const disconnectGoogle = async () => {
    setDisconnecting(true);
    try {
      const { error } = await supabase.functions.invoke('google-sheets-auth', {
        body: { action: 'disconnect' },
      });
      if (error) throw error;
      setConnectionStatus('not_configured');
      setConnectedEmail('');
      toast({ title: "Disconnected", description: "Google account has been disconnected." });
      loadSettings();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDisconnecting(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-sync', {
        body: { action: 'test-connection' },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Connection test failed');

      setConnectionStatus('connected');
      toast({ title: "Connected!", description: `Spreadsheet: ${data.title}` });
      loadSettings();
    } catch (error: any) {
      setConnectionStatus('error');
      toast({ title: "Connection Failed", description: error.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const isConnected = connectionStatus === 'connected';

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
        <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-green-600" />
          Google Sheets Integration
          <Badge variant={isConnected ? 'default' : 'secondary'} className="ml-auto">
            {isConnected ? (
              <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
            ) : connectionStatus === 'error' ? (
              <><XCircle className="h-3 w-3 mr-1" /> Error</>
            ) : (
              'Not Connected'
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <p className="text-sm text-slate-600">
          Sync orders to a Google Sheet automatically. Connect your Google account to get started.
        </p>

        {/* Google Account Connection */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div>
            <p className="text-sm font-medium">Google Account</p>
            {connectedEmail ? (
              <p className="text-sm text-slate-500">{connectedEmail}</p>
            ) : (
              <p className="text-sm text-slate-500">Not connected</p>
            )}
          </div>
          {isConnected ? (
            <Button variant="outline" size="sm" onClick={disconnectGoogle} disabled={disconnecting}>
              {disconnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
              Disconnect
            </Button>
          ) : (
            <Button size="sm" onClick={connectGoogle} disabled={connecting}>
              {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
              Connect with Google
            </Button>
          )}
        </div>

        {isConnected && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="spreadsheetId">Spreadsheet ID</Label>
                <Input
                  id="spreadsheetId"
                  placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                  value={spreadsheetId}
                  onChange={e => setSpreadsheetId(e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-1">Found in the Google Sheets URL between /d/ and /edit</p>
              </div>
              <div>
                <Label htmlFor="sheetName">Sheet Tab Name</Label>
                <Input
                  id="sheetName"
                  value={sheetName}
                  onChange={e => setSheetName(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="syncEnabled">Auto-sync Orders</Label>
                <p className="text-sm text-slate-500">Automatically sync when orders are created or updated</p>
              </div>
              <Switch id="syncEnabled" checked={syncEnabled} onCheckedChange={setSyncEnabled} />
            </div>

            {lastSyncedAt && (
              <div className="text-sm text-slate-600">
                <strong>Last Synced:</strong> {new Date(lastSyncedAt).toLocaleString()}
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={saveSettings} disabled={saving}>
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
              <Button variant="outline" onClick={testConnection} disabled={testing || !spreadsheetId}>
                {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TestTube className="h-4 w-4 mr-2" />}
                Test Connection
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
