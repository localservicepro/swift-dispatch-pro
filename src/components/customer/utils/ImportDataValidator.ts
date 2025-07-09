
import { ImportData, ParsedCustomerData, ConsolidatedCompany, ImportPreviewData } from '../types/ImportTypes';
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

  static validateAndConsolidate(
    data: ImportData[], 
    suburbs: any[]
  ): { previewData: ImportPreviewData; errors: string[] } {
    const errors: string[] = [];
    const companyGroups = new Map<string, { rows: ImportData[]; indices: number[] }>();
    const individualRows: { row: ImportData; index: number }[] = [];

    // Group rows by company name (case-insensitive)
    data.forEach((row, index) => {
      const companyKey = (row.company_name || row.business_name || '').toLowerCase().trim();
      
      if (companyKey && row.entity_type === 'business') {
        if (!companyGroups.has(companyKey)) {
          companyGroups.set(companyKey, { rows: [], indices: [] });
        }
        companyGroups.get(companyKey)!.rows.push(row);
        companyGroups.get(companyKey)!.indices.push(index);
      } else {
        individualRows.push({ row, index });
      }
    });

    // Process consolidated companies
    const consolidatedCompanies: ConsolidatedCompany[] = [];
    
    companyGroups.forEach((group, companyKey) => {
      const result = this.consolidateCompanyGroup(group.rows, group.indices, suburbs);
      if (result.customerData) {
        consolidatedCompanies.push(result);
      } else {
        group.indices.forEach((originalIndex) => {
          errors.push(`Row ${originalIndex + 2}: ${result.validationWarnings.join(', ')}`);
        });
      }
    });

    // Process individual customers
    const individualCustomers: ParsedCustomerData[] = [];
    
    individualRows.forEach(({ row, index }) => {
      const rowNumber = index + 2;
      const validationResult = this.validateRow(row, suburbs, rowNumber);
      
      if (validationResult.customerData) {
        individualCustomers.push(validationResult);
      } else {
        errors.push(`Row ${rowNumber}: ${validationResult.validationWarnings.join(', ')}`);
      }
    });

    const previewData: ImportPreviewData = {
      consolidatedCompanies,
      individualCustomers,
      totalOriginalRows: data.length
    };

    return { previewData, errors };
  }

  private static consolidateCompanyGroup(
    rows: ImportData[], 
    indices: number[], 
    suburbs: any[]
  ): ConsolidatedCompany {
    const warnings: string[] = [];
    
    // Use the first row as the primary company data
    const primaryRow = rows[0];
    const primaryIndex = indices[0];
    
    // Validate primary company data
    const primaryValidation = this.validateRow(primaryRow, suburbs, primaryIndex + 2);
    
    if (!primaryValidation.customerData) {
      return {
        customerData: null as any,
        additionalContacts: [],
        validationWarnings: primaryValidation.validationWarnings,
        sourceRows: indices
      };
    }

    // Create additional contacts from remaining rows
    const additionalContacts: Database['public']['Tables']['customer_contacts']['Insert'][] = [];
    
    rows.slice(1).forEach((row, i) => {
      const contactIndex = indices[i + 1];
      
      // Validate that contact has required info
      if (!row.first_name && !row.last_name && !row.email && !row.phone) {
        warnings.push(`Row ${contactIndex + 2}: Contact missing required information`);
        return;
      }

      // Check for address consistency
      if (row.full_address && row.full_address !== primaryRow.full_address) {
        warnings.push(`Row ${contactIndex + 2}: Different address for same company (will use company address)`);
      }

      additionalContacts.push({
        customer_id: '', // Will be set after company creation
        first_name: row.first_name || '',
        last_name: row.last_name || '',
        email: row.email || null,
        phone: row.phone || null,
        contact_role: row.contact_role || 'Contact',
        is_primary_contact: false,
        is_active: true
      });
    });

    return {
      customerData: primaryValidation.customerData,
      additionalContacts,
      validationWarnings: [...primaryValidation.validationWarnings, ...warnings],
      sourceRows: indices
    };
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
