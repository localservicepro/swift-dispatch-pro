export interface SuburbImportData {
  name: string;
  state: string;
  postcode: string;
  delivery_rate: string;
  distance_km?: number;
  is_active?: boolean;
}

export class SuburbImportParser {
  static parseCSV(file: File): Promise<SuburbImportData[]> {
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
          const data: SuburbImportData[] = [];

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
            
            if (values.length === 0 || values.every(v => !v)) continue;

            const row = this.mapRowToSuburbData(headers, values);
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

  private static mapRowToSuburbData(headers: string[], values: string[]): SuburbImportData | null {
    const row: Partial<SuburbImportData> = {};

    // Map columns based on header names
    headers.forEach((header, index) => {
      const value = values[index] || '';
      
      if (this.matchesHeader(header, ['name', 'suburb_name', 'suburb', 'locality'])) {
        row.name = value;
      } else if (this.matchesHeader(header, ['state', 'state_name', 'province'])) {
        row.state = value.toUpperCase();
      } else if (this.matchesHeader(header, ['postcode', 'post_code', 'zip', 'postal_code'])) {
        row.postcode = value;
      } else if (this.matchesHeader(header, ['delivery_rate', 'rate', 'fee', 'delivery_fee', 'cost'])) {
        // Remove currency symbols and clean the value
        row.delivery_rate = value.replace(/[$,]/g, '');
      } else if (this.matchesHeader(header, ['distance_km', 'distance', 'km', 'kilometers'])) {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          row.distance_km = numValue;
        }
      } else if (this.matchesHeader(header, ['is_active', 'active', 'status', 'enabled'])) {
        const lowerValue = value.toLowerCase();
        if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes' || lowerValue === 'active') {
          row.is_active = true;
        } else if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no' || lowerValue === 'inactive') {
          row.is_active = false;
        }
      }
    });

    // Validate required fields
    if (!row.name || !row.state || !row.postcode || !row.delivery_rate) {
      console.warn('Missing required fields for row:', row);
      return null;
    }

    // Set defaults
    if (row.is_active === undefined) {
      row.is_active = true;
    }

    return row as SuburbImportData;
  }

  private static matchesHeader(header: string, patterns: string[]): boolean {
    const normalizedHeader = header.toLowerCase().trim();
    
    // Check for exact matches first
    for (const pattern of patterns) {
      if (normalizedHeader === pattern.toLowerCase()) {
        return true;
      }
    }
    
    // Check for partial matches
    for (const pattern of patterns) {
      if (normalizedHeader.includes(pattern.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }
}