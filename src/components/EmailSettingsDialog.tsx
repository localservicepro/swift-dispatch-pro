
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useEmailSettings } from "@/hooks/useEmailSettings";
import { Settings, Eye, EyeOff, TestTube, ExternalLink } from "lucide-react";

export function EmailSettingsDialog() {
  const { settings, loading, saving, testing, saveSettings, testConnection } = useEmailSettings();
  const [showApiKey, setShowApiKey] = useState(false);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    sender_name: '',
    sender_email: '',
    reply_to_email: '',
    resend_api_key: ''
  });

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && settings) {
      setFormData({
        sender_name: settings.sender_name || '',
        sender_email: settings.sender_email || '',
        reply_to_email: settings.reply_to_email || '',
        resend_api_key: settings.resend_api_key || ''
      });
    }
  };

  const handleSave = async () => {
    try {
      await saveSettings(formData);
      setOpen(false);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleTest = async () => {
    await saveSettings(formData);
    await testConnection();
  };

  const getStatusBadge = () => {
    if (!settings) return null;

    switch (settings.connection_status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800">Connected</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Not Configured</Badge>;
    }
  };

  if (loading) {
    return <Button disabled>Loading...</Button>;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Email Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Email Configuration
            {getStatusBadge()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="sender_name">Sender Name</Label>
            <Input
              id="sender_name"
              value={formData.sender_name}
              onChange={(e) => setFormData({...formData, sender_name: e.target.value})}
              placeholder="SwiftDispatch Pro"
            />
          </div>

          <div>
            <Label htmlFor="sender_email">Sender Email</Label>
            <Input
              id="sender_email"
              type="email"
              value={formData.sender_email}
              onChange={(e) => setFormData({...formData, sender_email: e.target.value})}
              placeholder="updates@yourcompany.com"
            />
          </div>

          <div>
            <Label htmlFor="reply_to_email">Support Email</Label>
            <Input
              id="reply_to_email"
              type="email"
              value={formData.reply_to_email}
              onChange={(e) => setFormData({...formData, reply_to_email: e.target.value})}
              placeholder="support@yourcompany.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              This email will be used for customer support contacts
            </p>
          </div>

          <div>
            <Label htmlFor="resend_api_key">Resend API Key</Label>
            <div className="relative">
              <Input
                id="resend_api_key"
                type={showApiKey ? "text" : "password"}
                value={formData.resend_api_key}
                onChange={(e) => setFormData({...formData, resend_api_key: e.target.value})}
                placeholder="re_..."
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <a 
                href="https://resend.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                Get API Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {settings?.last_tested_at && (
            <p className="text-xs text-gray-500">
              Last tested: {new Date(settings.last_tested_at).toLocaleString()}
            </p>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleTest} 
              disabled={testing || saving || !formData.resend_api_key}
              variant="outline"
              className="flex items-center gap-2"
            >
              <TestTube className="w-4 h-4" />
              {testing ? "Testing..." : "Test Configuration"}
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="flex-1"
            >
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
