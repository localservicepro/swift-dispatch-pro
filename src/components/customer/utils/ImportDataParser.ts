
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
          
          // Detect "wide" format contacts (contact1_first_name, contact2_email, etc.)
          const extractContactIndices = (hdrs: string[]): number[] => {
            const nums = new Set<number>();
            const norm = (s: string) => s.toLowerCase().trim().replace(/['"]/g, '').replace(/\s+/g, '_');
            hdrs.forEach(h => {
              const n = norm(h);
              const m = n.match(/^contact[_]?(\d+)_/);
              if (m && m[1]) nums.add(parseInt(m[1], 10));
            });
            // Include base contact fields if present (first_name or contact_first_name without number)
            const hasBase =
              hdrs.some(h => this.matchesHeader(h, ['first_name','firstname','first name','fname','contact_first_name'])) ||
              hdrs.some(h => this.matchesHeader(h, ['last_name','lastname','last name','lname','surname','contact_last_name'])) ||
              hdrs.some(h => this.matchesHeader(h, ['email','email_address','contact_email'])) ||
              hdrs.some(h => this.matchesHeader(h, ['phone','phone_number','mobile','contact_phone','telephone']));
            return Array.from(nums).sort((a,b)=>a-b).concat(hasBase ? [0] : []);
          };

          const remapHeadersForContact = (hdrs: string[], idx: number): string[] => {
            if (idx === 0) return hdrs;
            const norm = (s: string) => s.toLowerCase().trim().replace(/['"]/g, '').replace(/\s+/g, '_');
            const target = (field: string) => {
              if (['first_name','firstname','first','first-name','first name','contact_first_name','contact-first-name'].includes(field)) return 'first_name';
              if (['last_name','lastname','last','last-name','last name','surname','contact_last_name','contact-last-name'].includes(field)) return 'last_name';
              if (['email','email_address','contact_email'].includes(field)) return 'email';
              if (['phone','phone_number','mobile','contact_phone','telephone'].includes(field)) return 'phone';
              if (['contact_role','position','title','job_title','role'].includes(field)) return 'contact_role';
              return '';
            };
            return hdrs.map(h => {
              const n = norm(h);
              const m = n.match(new RegExp(`^contact[_]?${idx}_(.+)$`));
              if (m && m[1]) {
                const mapped = target(m[1]);
                if (mapped) return mapped;
              }
              return h;
            });
          };

          // Parse data rows (supports both long and wide formats)
          const data: ImportData[] = [];
          const contactIndices = extractContactIndices(headers);

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
            
            if (values.length === 0 || values.every(v => !v)) continue;

            if (contactIndices.length > 0) {
              // For each detected contact index, create a normalized row
              for (const idx of contactIndices) {
                const remapped = remapHeadersForContact(headers, idx);
                const row = this.mapRowToImportData(remapped, values);
                if (row) {
                  data.push(row);
                }
              }
            } else {
              const row = this.mapRowToImportData(headers, values);
              if (row) {
                data.push(row);
              }
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
      console.log(`Processing column "${header}" with value "${value}"`);
      
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
      } else if (this.matchesHeader(header, ['contact_role', 'position', 'title', 'job_title'])) {
        row.contact_role = value;
        console.log(`Contact role mapped: "${header}" = "${value}"`);
      }
      
      // State info (separate from role to avoid conflicts)
      else if (this.matchesHeader(header, ['state', 'state_name', 'province'])) {
        row.state = value;
      }
      
      // Address Info
      else if (this.matchesHeader(header, ['full_address', 'address', 'delivery_address', 'street_address', 'full address'])) {
        row.full_address = value;
        row.delivery_address = value;
      }
      
      // Suburb Info (preserve raw values even if not in database)
      else if (this.matchesHeader(header, ['suburb', 'suburb_name', 'city', 'locality'])) {
        row.suburb_name = value;
        console.log(`Suburb mapped: "${header}" = "${value}"`);
      } else if (this.matchesHeader(header, ['postcode', 'post_code', 'zip', 'postal_code'])) {
        row.postcode = value;
        console.log(`Postcode mapped: "${header}" = "${value}"`);
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

    const hasAnyData = !!(row.full_address || row.company_name || row.business_name || row.first_name || row.last_name || row.email || row.phone);
    return hasAnyData ? row : null;
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
