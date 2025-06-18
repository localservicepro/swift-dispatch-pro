
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Send, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";

interface EmailSettings {
  id: string;
  resend_api_key: string | null;
  sender_name: string;
  sender_email: string;
  reply_to_email: string | null;
  email_provider: string;
  connection_status: string;
  last_tested_at: string | null;
}

export function EmailSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey] = useState(false);
  const [formData, setFormData] = useState({
    resend_api_key: '',
    sender_name: 'SwiftDispatch Pro',
    sender_email: 'updates@localservicepro.com.au',
    reply_to_email: ''
  });

  // Fetch email settings
  const { data: emailSettings, isLoading } = useQuery({
    queryKey: ['email-settings'],
    queryFn: async (): Promise<EmailSettings | null> => {
      const { data, error } = await supabase
        .from('email_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching email settings:', error);
        return null;
      }

      return data;
    },
  });

  // Update form data when settings are loaded
  useEffect(() => {
    if (emailSettings) {
      setFormData({
        resend_api_key: emailSettings.resend_api_key || '',
        sender_name: emailSettings.sender_name,
        sender_email: emailSettings.sender_email,
        reply_to_email: emailSettings.reply_to_email || ''
      });
    }
  }, [emailSettings]);

  // Save email settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('email_settings')
        .upsert({
          id: emailSettings?.id,
          resend_api_key: data.resend_api_key || null,
          sender_name: data.sender_name,
          sender_email: data.sender_email,
          reply_to_email: data.reply_to_email || null,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Email Settings Saved",
        description: "Your email configuration has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
    },
    onError: (error: any) => {
      console.error('Error saving email settings:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save email settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Test email connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('test-email-connection', {
        body: {
          api_key: formData.resend_api_key,
          sender_email: formData.sender_email,
          sender_name: formData.sender_name
        }
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Connection Test Successful",
        description: "Email service is working correctly",
      });
      queryClient.invalidateQueries({ queryKey: ['email-settings'] });
    },
    onError: (error: any) => {
      console.error('Error testing email connection:', error);
      toast({
        title: "Connection Test Failed",
        description: error.message || "Failed to connect to email service",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(formData);
  };

  const handleTestConnection = () => {
    if (!formData.resend_api_key) {
      toast({
        title: "API Key Required",
        description: "Please enter your Resend API key before testing",
        variant: "destructive",
      });
      return;
    }
    testConnectionMutation.mutate();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
          <CardTitle className="text-lg font-semibold text-slate-800">Email Configuration</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-slate-600">Loading email settings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-800">Email Configuration</CardTitle>
          {emailSettings && (
            <div className="flex items-center gap-2">
              {getStatusIcon(emailSettings.connection_status)}
              <Badge className={getStatusColor(emailSettings.connection_status)}>
                {emailSettings.connection_status}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* API Key Configuration */}
        <div className="space-y-4">
          <h3 className="text-md font-semibold text-slate-700">Resend API Configuration</h3>
          
          <div className="space-y-2">
            <Label htmlFor="resendApiKey">Resend API Key</Label>
            <div className="relative">
              <Input
                id="resendApiKey"
                type={showApiKey ? "text" : "password"}
                placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={formData.resend_api_key}
                onChange={(e) => setFormData({...formData, resend_api_key: e.target.value})}
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
            <p className="text-sm text-slate-500">
              Get your API key from <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Resend Dashboard</a>
            </p>
          </div>
        </div>

        {/* Sender Configuration */}
        <div className="space-y-4">
          <h3 className="text-md font-semibold text-slate-700">Sender Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="senderName">Sender Name</Label>
              <Input
                id="senderName"
                placeholder="Your Business Name"
                value={formData.sender_name}
                onChange={(e) => setFormData({...formData, sender_name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="senderEmail">Sender Email</Label>
              <Input
                id="senderEmail"
                type="email"
                placeholder="noreply@yourdomain.com"
                value={formData.sender_email}
                onChange={(e) => setFormData({...formData, sender_email: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="replyToEmail">Reply-To Email (Optional)</Label>
            <Input
              id="replyToEmail"
              type="email"
              placeholder="support@yourdomain.com"
              value={formData.reply_to_email}
              onChange={(e) => setFormData({...formData, reply_to_email: e.target.value})}
            />
            <p className="text-sm text-slate-500 mt-1">
              If specified, customers can reply to this email address
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button 
            onClick={handleSave}
            disabled={saveSettingsMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleTestConnection}
            disabled={testConnectionMutation.isPending || !formData.resend_api_key}
            className="flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {testConnectionMutation.isPending ? "Testing..." : "Test Connection"}
          </Button>
        </div>

        {emailSettings?.last_tested_at && (
          <p className="text-sm text-slate-500">
            Last tested: {new Date(emailSettings.last_tested_at).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
