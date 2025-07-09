
import { Database } from '@/integrations/supabase/types';

export interface ImportData {
  // Personal Info
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  
  // Business Info
  company_name?: string;
  business_name?: string;
  contact_role?: string;
  
  // Address Info
  full_address: string;
  delivery_address?: string;
  
  // Suburb Info
  suburb_id?: string;
  suburb_name?: string;
  postcode?: string;
  
  // Customer Classification
  customer_type?: 'trade' | 'account' | 'residential';
  entity_type?: 'individual' | 'business';
}

export interface ParsedCustomerData {
  customerData: Database['public']['Tables']['customers']['Insert'];
  validationWarnings: string[];
}

export interface ConsolidatedCompany {
  customerData: Database['public']['Tables']['customers']['Insert'];
  additionalContacts: Database['public']['Tables']['customer_contacts']['Insert'][];
  validationWarnings: string[];
  sourceRows: number[];
}

export interface ImportPreviewData {
  consolidatedCompanies: ConsolidatedCompany[];
  individualCustomers: ParsedCustomerData[];
  totalOriginalRows: number;
}

export interface ImportResult {
  successCount: number;
  errorCount: number;
  errors: string[];
}

export interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
