
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Mail, Send, AlertCircle, CheckCircle } from "lucide-react";

interface EmailLog {
  id: string;
  email_type: string;
  recipient_email: string;
  subject: string;
  status: string;
  error_message?: string;
  sent_at: string;
}

export function EmailManagement() {
  const { toast } = useToast();

  // Fetch email logs with proper type handling
  const { data: emailLogs = [], isLoading, refetch } = useQuery({
    queryKey: ['email-logs'],
    queryFn: async (): Promise<EmailLog[]> => {
      console.log('Fetching email logs...');
      try {
        // Use raw query to bypass type checking issues
        const { data, error } = await supabase
          .from('email_logs' as any)
          .select('id, email_type, recipient_email, subject, status, error_message, sent_at')
          .order('sent_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Error fetching email logs:', error);
          return [];
        }

        // Safely validate and return data
        if (!data) return [];
        
        // Type guard to ensure data structure is correct
        const validLogs = data.filter((item: any) => 
          item && 
          typeof item === 'object' && 
          'id' in item && 
          'email_type' in item &&
          'recipient_email' in item &&
          'subject' in item &&
          'status' in item &&
          'sent_at' in item
        );

        return validLogs as EmailLog[];
      } catch (err) {
        console.error('Error in email logs query:', err);
        return [];
      }
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEmailTypeIcon = (type: string) => {
    switch (type) {
      case 'order-confirmation': return <CheckCircle className="w-4 h-4" />;
      case 'delivery-status-update': return <Send className="w-4 h-4" />;
      case 'invoice': return <Mail className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getEmailTypeLabel = (type: string) => {
    switch (type) {
      case 'order-confirmation': return 'Order Confirmation';
      case 'delivery-status-update': return 'Delivery Update';
      case 'invoice': return 'Invoice';
      default: return type;
    }
  };

  const testEmailSystem = async () => {
    try {
      const { error } = await supabase.functions.invoke('send-emails', {
        body: {
          type: 'order-confirmation',
          data: {
            customerName: 'Test Customer',
            customerEmail: 'test@example.com',
            orderNumber: 'TEST-001',
            orderItems: [
              { name: 'Test Product', quantity: 1, price: 25.00 }
            ],
            totalAmount: 30.00,
            deliveryAddress: '123 Test Street, Test City',
            deliveryDate: new Date().toLocaleDateString(),
            deliveryTime: '10:00 AM',
            specialInstructions: 'This is a test email'
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Test Email Sent",
        description: "A test order confirmation email has been sent",
      });
      
      // Refresh the logs
      refetch();
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast({
        title: "Test Failed",
        description: "Failed to send test email. Check the console for details.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Email Management</h2>
          <p className="text-slate-600 mt-1">Monitor email delivery and manage preferences</p>
        </div>
        <Button onClick={testEmailSystem} className="flex items-center gap-2">
          <Send className="w-4 h-4" />
          Send Test Email
        </Button>
      </div>

      {/* Email Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {emailLogs.length}
            </div>
            <p className="text-xs text-blue-600 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {emailLogs.filter(log => log.status === 'sent').length}
            </div>
            <p className="text-xs text-green-600 mt-1">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">
              {emailLogs.filter(log => log.status === 'failed').length}
            </div>
            <p className="text-xs text-red-600 mt-1">Delivery failed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900">
              {emailLogs.filter(log => log.status === 'pending').length}
            </div>
            <p className="text-xs text-yellow-600 mt-1">Awaiting delivery</p>
          </CardContent>
        </Card>
      </div>

      {/* Email Logs */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">
            Recent Email Activity
            {isLoading && <span className="text-sm font-normal text-slate-500 ml-2">(Loading...)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-slate-600">Loading email logs...</p>
            </div>
          ) : emailLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Mail className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No emails sent yet. Send a test email to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {emailLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getEmailTypeIcon(log.email_type)}
                      <h3 className="font-semibold text-slate-800">{log.subject}</h3>
                      <Badge className={getStatusColor(log.status)}>{log.status}</Badge>
                    </div>
                    <span className="text-sm text-slate-500">
                      {new Date(log.sent_at).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Email Type</p>
                      <p className="font-medium">{getEmailTypeLabel(log.email_type)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Recipient</p>
                      <p className="font-medium">{log.recipient_email}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Status</p>
                      <p className="font-medium capitalize">{log.status}</p>
                    </div>
                  </div>
                  
                  {log.error_message && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
                      <p className="text-red-800"><strong>Error:</strong> {log.error_message}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
