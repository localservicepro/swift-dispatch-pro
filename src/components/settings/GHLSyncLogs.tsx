
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ghlService } from "@/utils/ghlService";
import { Activity, CheckCircle, XCircle, Clock } from "lucide-react";

export function GHLSyncLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const data = await ghlService.getSyncLogs();
      // Ensure we set an array, handling the case where data might be a string or other type
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading sync logs:', error);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const getOperationText = (log: any) => {
    const operation = log.operation.charAt(0).toUpperCase() + log.operation.slice(1);
    const type = log.sync_type.charAt(0).toUpperCase() + log.sync_type.slice(1);
    return `${operation} ${type}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading sync logs...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
        <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          GoHighLevel Sync Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <ScrollArea className="h-96">
          {logs.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              No sync activity yet
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{getOperationText(log)}</span>
                      {getStatusBadge(log.status)}
                    </div>
                    <div className="text-sm text-slate-600">
                      {log.sync_type === 'customer' && log.ghl_contact_id && (
                        <span>GHL Contact ID: {log.ghl_contact_id}</span>
                      )}
                      {log.sync_type === 'order' && log.ghl_opportunity_id && (
                        <span>GHL Opportunity ID: {log.ghl_opportunity_id}</span>
                      )}
                      {log.error_message && (
                        <div className="text-red-600 mt-1">Error: {log.error_message}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
