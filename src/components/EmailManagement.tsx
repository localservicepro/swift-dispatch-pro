import { EmailSettingsDialog } from "./EmailSettingsDialog";
import { EmailStatsCards } from "./email/EmailStatsCards";
import { EmailLogsTable } from "./email/EmailLogsTable";
import { useEmailLogs } from "@/hooks/useEmailLogs";
export function EmailManagement() {
  const {
    data: emailLogs = [],
    isLoading
  } = useEmailLogs();
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-800 text-lg">Email Management</h2>
          <p className="text-slate-600 mt-1">Monitor email delivery and manage email settings</p>
        </div>
        <EmailSettingsDialog />
      </div>

      <EmailStatsCards emailLogs={emailLogs} />
      <EmailLogsTable emailLogs={emailLogs} isLoading={isLoading} />
    </div>;
}