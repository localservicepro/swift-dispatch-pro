
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface EmailLogsTableProps {
  emailLogs: EmailLog[];
  isLoading: boolean;
}

export function EmailLogsTable({ emailLogs, isLoading }: EmailLogsTableProps) {
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
      case 'payment-confirmation': return <CheckCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getEmailTypeLabel = (type: string) => {
    switch (type) {
      case 'order-confirmation': return 'Order Confirmation';
      case 'delivery-status-update': return 'Delivery Update';
      case 'invoice': return 'Invoice';
      case 'payment-confirmation': return 'Payment Confirmation';
      default: return type;
    }
  };

  return (
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
            <p>No emails sent yet. Configure your email settings to get started!</p>
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
  );
}
