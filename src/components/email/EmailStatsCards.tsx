
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EmailLog {
  id: string;
  status: string;
}

interface EmailStatsCardsProps {
  emailLogs: EmailLog[];
}

export function EmailStatsCards({ emailLogs }: EmailStatsCardsProps) {
  const totalSent = emailLogs.length;
  const delivered = emailLogs.filter(log => log.status === 'sent').length;
  const failed = emailLogs.filter(log => log.status === 'failed').length;
  const pending = emailLogs.filter(log => log.status === 'pending').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-blue-700">Total Sent</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-900">{totalSent}</div>
          <p className="text-xs text-blue-600 mt-1">All time</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-green-700">Delivered</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-900">{delivered}</div>
          <p className="text-xs text-green-600 mt-1">Successfully delivered</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-red-700">Failed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-900">{failed}</div>
          <p className="text-xs text-red-600 mt-1">Delivery failed</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-yellow-700">Pending</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-900">{pending}</div>
          <p className="text-xs text-yellow-600 mt-1">Awaiting delivery</p>
        </CardContent>
      </Card>
    </div>
  );
}
