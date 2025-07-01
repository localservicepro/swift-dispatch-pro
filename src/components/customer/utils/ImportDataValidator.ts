
import { ImportData, ParsedCustomerData } from '../types/ImportTypes';
import { Database } from '@/integrations/supabase/types';

export class ImportDataValidator {
  static validateAndTransform(
    data: ImportData[], 
    suburbs: any[]
  ): { validData: ParsedCustomerData[]; errors: string[] } {
    const validData: ParsedCustomerData[] = [];
    const errors: string[] = [];

    data.forEach((row, index) => {
      const rowNumber = index + 2; // +2 because index is 0-based and we skip header
      const validationResult = this.validateRow(row, suburbs, rowNumber);
      
      if (validationResult.customerData) {
        validData.push(validationResult);
      } else {
        errors.push(`Row ${rowNumber}: ${validationResult.validationWarnings.join(', ')}`);
      }
    });

    return { validData, errors };
  }

  private static validateRow(
    row: ImportData, 
    suburbs: any[], 
    rowNumber: number
  ): ParsedCustomerData {
    const warnings: string[] = [];
    let customerData: Database['public']['Tables']['customers']['Insert'] | null = null;

    // Validate required fields
    if (!row.full_address) {
      warnings.push('Address is required');
    }

    // Validate entity-specific requirements
    if (row.entity_type === 'individual') {
      if (!row.first_name && !row.last_name) {
        warnings.push('First name or last name is required for individuals');
      }
    } else if (row.entity_type === 'business') {
      if (!row.company_name && !row.business_name) {
        warnings.push('Company name is required for businesses');
      }
    }

    // Try to match suburb by name or postcode if suburb_id not provided
    let suburbId = row.suburb_id;
    if (!suburbId && (row.suburb_name || row.postcode)) {
      const matchedSuburb = suburbs.find(s => 
        (row.suburb_name && s.name.toLowerCase() === row.suburb_name.toLowerCase()) ||
        (row.postcode && s.postcode === row.postcode)
      );
      
      if (matchedSuburb) {
        suburbId = matchedSuburb.id;
      }
    }

    // If no critical errors, create customer data
    if (warnings.length === 0 || (warnings.length > 0 && row.full_address)) {
      customerData = {
        // Personal Info
        first_name: row.first_name || null,
        last_name: row.last_name || null,
        email: row.email || null,
        phone: row.phone || null,
        
        // Business Info
        company_name: row.company_name || row.business_name || null,
        business_name: row.business_name || row.company_name || null,
        contact_role: row.contact_role || 'Primary Contact',
        
        // Address
        full_address: row.full_address,
        suburb_id: suburbId || null,
        
        // Classification
        customer_type: row.customer_type || 'trade',
        entity_type: row.entity_type || 'individual',
        
        // Defaults
        is_active: true
      };
    }

    return {
      customerData,
      validationWarnings: warnings
    };
  }
}
