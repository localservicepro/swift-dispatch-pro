
import { ImportData } from '../types/ImportTypes';

export class ImportDataParser {
  static parseCSV(file: File): Promise<ImportData[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length === 0) {
            reject(new Error('CSV file is empty'));
            return;
          }

          // Parse header
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
          console.log('CSV Headers:', headers);
          
          // Parse data rows
          const data: ImportData[] = [];

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
            
            if (values.length === 0 || values.every(v => !v)) continue;

            const row = this.mapRowToImportData(headers, values);
            if (row) {
              data.push(row);
            }
          }

          resolve(data);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private static mapRowToImportData(headers: string[], values: string[]): ImportData | null {
    const row: ImportData = {
      full_address: ''
    };

    // Map columns based on header names
    headers.forEach((header, index) => {
      const value = values[index] || '';
      
      // Personal Info
      if (this.matchesHeader(header, ['first_name', 'firstname', 'first name', 'fname', 'contact_first_name'])) {
        row.first_name = value;
      } else if (this.matchesHeader(header, ['last_name', 'lastname', 'last name', 'lname', 'surname', 'contact_last_name'])) {
        row.last_name = value;
      } else if (this.matchesHeader(header, ['email', 'email_address', 'contact_email'])) {
        row.email = value;
      } else if (this.matchesHeader(header, ['phone', 'phone_number', 'mobile', 'contact_phone', 'telephone'])) {
        row.phone = value;
      }
      
      // Business Info
      else if (this.matchesHeader(header, ['company_name', 'company', 'business_name', 'business', 'organisation', 'organization'])) {
        row.company_name = value;
        row.business_name = value;
      } else if (this.matchesHeader(header, ['contact_role', 'role', 'position', 'title', 'job_title'])) {
        row.contact_role = value;
      }
      
      // Address Info
      else if (this.matchesHeader(header, ['full_address', 'address', 'delivery_address', 'street_address', 'full address'])) {
        row.full_address = value;
        row.delivery_address = value;
      }
      
      // Suburb Info
      else if (this.matchesHeader(header, ['suburb', 'suburb_name', 'city', 'locality'])) {
        row.suburb_name = value;
      } else if (this.matchesHeader(header, ['postcode', 'post_code', 'zip', 'postal_code'])) {
        row.postcode = value;
      } else if (this.matchesHeader(header, ['suburb_id'])) {
        row.suburb_id = value;
      }
      
      // Customer Classification
      else if (this.matchesHeader(header, ['customer_type', 'type', 'customer type'])) {
        const normalizedType = value.toLowerCase().trim();
        if (normalizedType && ['trade', 'account', 'residential'].includes(normalizedType)) {
          row.customer_type = normalizedType as 'trade' | 'account' | 'residential';
        }
      } else if (this.matchesHeader(header, ['entity_type', 'entity type', 'customer_entity'])) {
        const normalizedEntity = value.toLowerCase().trim();
        if (normalizedEntity && ['individual', 'business'].includes(normalizedEntity)) {
          row.entity_type = normalizedEntity as 'individual' | 'business';
        }
      }
    });

    // Auto-detect entity type if not specified
    if (!row.entity_type) {
      if (row.company_name || row.business_name) {
        row.entity_type = 'business';
      } else if (row.first_name || row.last_name) {
        row.entity_type = 'individual';
      }
    }

    // Default customer type if not specified (log for debugging)
    if (!row.customer_type) {
      console.log('Defaulting customer_type to trade for row:', row);
      row.customer_type = 'trade';
    } else {
      console.log('Customer type set to:', row.customer_type, 'for row:', row);
    }

    // Use delivery_address as full_address if full_address is empty
    if (!row.full_address && row.delivery_address) {
      row.full_address = row.delivery_address;
    }

    return row.full_address ? row : null;
  }

  private static matchesHeader(header: string, patterns: string[]): boolean {
    const normalizedHeader = header.toLowerCase().trim();
    
    // First check for exact matches (highest priority)
    for (const pattern of patterns) {
      if (normalizedHeader === pattern.toLowerCase()) {
        console.log(`Exact match found: "${header}" matches pattern "${pattern}"`);
        return true;
      }
    }
    
    // Then check for word boundary matches (medium priority)
    for (const pattern of patterns) {
      const regex = new RegExp(`\\b${pattern.toLowerCase()}\\b`);
      if (regex.test(normalizedHeader)) {
        console.log(`Word boundary match found: "${header}" matches pattern "${pattern}"`);
        return true;
      }
    }
    
    // Finally check for starts-with matches (lowest priority, for compound headers)
    for (const pattern of patterns) {
      if (normalizedHeader.startsWith(pattern.toLowerCase())) {
        console.log(`Starts-with match found: "${header}" matches pattern "${pattern}"`);
        return true;
      }
    }
    
    return false;
  }
}
