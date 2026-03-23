import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileSpreadsheet, TestTube, Loader2, CheckCircle, XCircle } from "lucide-react";

export function GoogleSheetsSettings() {
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [sheetName, setSheetName] = useState("Orders");
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("not_configured");
  const [serviceAccountEmail, setServiceAccountEmail] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
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
      setServiceAccountEmail(data.service_account_email || "");
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
        .neq('id', '00000000-0000-0000-0000-000000000000'); // update all rows
      if (error) throw error;
      toast({ title: "Settings Saved", description: "Google Sheets settings updated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
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

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
        <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-green-600" />
          Google Sheets Integration
          <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'} className="ml-auto">
            {connectionStatus === 'connected' ? (
              <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
            ) : connectionStatus === 'error' ? (
              <><XCircle className="h-3 w-3 mr-1" /> Error</>
            ) : (
              'Not Configured'
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <p className="text-sm text-slate-600">
          Sync orders to a Google Sheet automatically. Requires a Google Cloud service account with Sheets API access.
        </p>

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

        {serviceAccountEmail && (
          <div className="text-sm text-slate-600">
            <strong>Service Account:</strong> {serviceAccountEmail}
          </div>
        )}

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
      </CardContent>
    </Card>
  );
}
