
import { supabase } from "@/integrations/supabase/client";

export interface SupportEmailOptions {
  subject?: string;
  body?: string;
  orderId?: string;
  sessionId?: string;
  invoiceId?: string;
}

class SupportEmailService {
  private defaultEmail = 'support@localservicepro.com.au';
  private cachedEmail: string | null = null;

  async getSupportEmail(): Promise<string> {
    try {
      if (this.cachedEmail) {
        return this.cachedEmail;
      }

      const { data, error } = await supabase
        .from('email_settings')
        .select('reply_to_email')
        .single();

      if (error || !data?.reply_to_email) {
        console.warn('No support email configured, using default');
        return this.defaultEmail;
      }

      this.cachedEmail = data.reply_to_email;
      return this.cachedEmail;
    } catch (error) {
      console.error('Error fetching support email:', error);
      return this.defaultEmail;
    }
  }

  async getAdminEmail(): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('email_settings')
        .select('admin_email')
        .single();

      if (error || !data?.admin_email) {
        console.warn('No admin email configured, using default');
        return 'admin@localservicepro.com.au';
      }

      return data.admin_email;
    } catch (error) {
      console.error('Error fetching admin email:', error);
      return 'admin@localservicepro.com.au';
    }
  }

  async openSupportEmail(options: SupportEmailOptions = {}) {
    const supportEmail = await this.getSupportEmail();
    
    const subject = options.subject || 'Support Request';
    let body = options.body || 'Hello, I need assistance with:\n\n';
    
    // Add context if provided
    if (options.orderId) {
      body += `\nOrder ID: ${options.orderId}`;
    }
    if (options.sessionId) {
      body += `\nPayment Session: ${options.sessionId}`;
    }
    if (options.invoiceId) {
      body += `\nInvoice ID: ${options.invoiceId}`;
    }
    
    body += '\n\nThank you for your help.';

    const mailtoUrl = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      window.open(mailtoUrl, '_self');
    } catch (error) {
      console.error('Failed to open email client:', error);
      // Fallback: copy email to clipboard
      navigator.clipboard?.writeText(supportEmail);
      throw new Error(`Please contact support at: ${supportEmail}`);
    }
  }

  clearCache() {
    this.cachedEmail = null;
  }
}

export const supportEmailService = new SupportEmailService();
