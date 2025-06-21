
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface EmailLog {
  id: string;
  email_type: string;
  recipient_email: string;
  subject: string;
  status: string;
  error_message?: string;
  sent_at: string;
}

export function useEmailLogs() {
  return useQuery({
    queryKey: ['email-logs'],
    queryFn: async (): Promise<EmailLog[]> => {
      console.log('Fetching email logs...');
      try {
        const { data, error } = await supabase
          .from('email_logs')
          .select('id, email_type, recipient_email, subject, status, error_message, sent_at')
          .order('sent_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Error fetching email logs:', error);
          return [];
        }

        return data || [];
      } catch (err) {
        console.error('Error in email logs query:', err);
        return [];
      }
    },
  });
}
