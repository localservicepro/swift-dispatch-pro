import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, Settings, Unplug } from "lucide-react";

interface MyobSettingsData {
  connection_status: string;
  default_account_number: string;
  company_file_id?: string;
}

export function MyobSettings() {
  const [settings, setSettings] = useState<MyobSettingsData>({
    connection_status: "not_configured",
    default_account_number: "4-1010",
  });
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [companyFileId, setCompanyFileId] = useState("");
  const [companyFileUsername, setCompanyFileUsername] = useState("");
  const [companyFilePassword, setCompanyFilePassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("myob-auth", {
        body: { action: "get-settings" },
      });
      if (error) throw error;
      if (data?.settings) {
        setSettings(data.settings);
        setCompanyFileId(data.settings.company_file_id || "");
      }
    } catch (err: any) {
      console.error("Error fetching MYOB settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveCredentials = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("myob-auth", {
        body: {
          action: "save-credentials",
          clientId,
          clientSecret,
          companyFileId,
          companyFileUsername,
          companyFilePassword,
        },
      });
      if (error) throw error;
      toast({ title: "MYOB Settings Saved", description: "Your MYOB credentials have been saved successfully" });
      fetchSettings();
      // Clear sensitive fields after save
      setClientSecret("");
      setCompanyFilePassword("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save MYOB settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleOAuthConnect = async () => {
    // For now, manual OAuth flow — user provides access/refresh tokens or uses code exchange
    toast({
      title: "OAuth Flow",
      description: "Please save your API credentials first, then use the MYOB developer portal to authorize and provide the OAuth code.",
    });
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const { error } = await supabase.functions.invoke("myob-auth", {
        body: { action: "disconnect" },
      });
      if (error) throw error;
      toast({ title: "Disconnected", description: "MYOB connection has been disconnected" });
      fetchSettings();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDisconnecting(false);
    }
  };

  const getStatusBadge = () => {
    switch (settings.connection_status) {
      case "connected":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
      case "configured":
        return <Badge className="bg-yellow-100 text-yellow-800"><Settings className="w-3 h-3 mr-1" />Configured (Not Authorized)</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800"><XCircle className="w-3 h-3 mr-1" />Not Configured</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
        <CardTitle className="text-lg font-semibold text-slate-800 flex items-center justify-between">
          <span>MYOB AccountRight Integration</span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <p className="text-sm text-muted-foreground">
          Connect to MYOB AccountRight to push batch invoices directly from Payment Management.
          Your company file must be hosted online for API access.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="myob-client-id">API Key (Client ID)</Label>
            <Input
              id="myob-client-id"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Enter MYOB API Key"
              type="password"
            />
          </div>
          <div>
            <Label htmlFor="myob-client-secret">API Secret (Client Secret)</Label>
            <Input
              id="myob-client-secret"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Enter MYOB API Secret"
              type="password"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="myob-company-file-id">Company File ID</Label>
            <Input
              id="myob-company-file-id"
              value={companyFileId}
              onChange={(e) => setCompanyFileId(e.target.value)}
              placeholder="Company File GUID"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="myob-cf-username">Company File Username</Label>
            <Input
              id="myob-cf-username"
              value={companyFileUsername}
              onChange={(e) => setCompanyFileUsername(e.target.value)}
              placeholder="Administrator"
            />
          </div>
          <div>
            <Label htmlFor="myob-cf-password">Company File Password</Label>
            <Input
              id="myob-cf-password"
              value={companyFilePassword}
              onChange={(e) => setCompanyFilePassword(e.target.value)}
              placeholder="Company file password"
              type="password"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={saveCredentials}
            disabled={saving || !clientId}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : "Save MYOB Settings"}
          </Button>

          {settings.connection_status === "connected" && (
            <Button
              onClick={handleDisconnect}
              disabled={disconnecting}
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {disconnecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Unplug className="w-4 h-4 mr-2" />}
              Disconnect
            </Button>
          )}
        </div>

        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Setup Guide</h4>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Register your app at <strong>my.myob.com.au/au/bd/DevAppList</strong> to get API Key & Secret</li>
            <li>Note your Company File ID from the MYOB API response</li>
            <li>Enter all credentials above and save</li>
            <li>Complete OAuth authorization when prompted</li>
            <li>Go to Payment Management to start pushing batch invoices</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
