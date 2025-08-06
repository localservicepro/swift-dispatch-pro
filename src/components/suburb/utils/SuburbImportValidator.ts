import { SuburbImportData } from './SuburbImportParser';

const AUSTRALIAN_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];

export class SuburbImportValidator {
  static validate(data: SuburbImportData[]): { validData: SuburbImportData[]; errors: string[] } {
    const validData: SuburbImportData[] = [];
    const errors: string[] = [];

    data.forEach((row, index) => {
      const rowErrors: string[] = [];
      const lineNumber = index + 2; // +2 for header row and 0-based index

      // Validate name
      if (!row.name || row.name.trim().length === 0) {
        rowErrors.push('Missing suburb name');
      } else if (row.name.length > 100) {
        rowErrors.push('Suburb name too long (max 100 characters)');
      }

      // Validate state
      if (!row.state || row.state.trim().length === 0) {
        rowErrors.push('Missing state');
      } else if (!AUSTRALIAN_STATES.includes(row.state.toUpperCase())) {
        rowErrors.push(`Invalid state: ${row.state}. Must be one of: ${AUSTRALIAN_STATES.join(', ')}`);
      }

      // Validate postcode
      if (!row.postcode || row.postcode.trim().length === 0) {
        rowErrors.push('Missing postcode');
      } else if (!/^\d{4}$/.test(row.postcode)) {
        rowErrors.push(`Invalid postcode: ${row.postcode}. Must be 4 digits`);
      }

      // Validate delivery rate
      if (!row.delivery_rate || row.delivery_rate.trim().length === 0) {
        rowErrors.push('Missing delivery rate');
      } else {
        const rate = parseFloat(row.delivery_rate);
        if (isNaN(rate)) {
          rowErrors.push(`Invalid delivery rate: ${row.delivery_rate}. Must be a number`);
        } else if (rate < 0) {
          rowErrors.push(`Invalid delivery rate: ${row.delivery_rate}. Must be positive`);
        } else if (rate > 999999.99) {
          rowErrors.push(`Delivery rate too high: ${row.delivery_rate}. Maximum is 999,999.99`);
        }
      }

      // Validate distance (optional field)
      if (row.distance_km !== undefined) {
        if (isNaN(row.distance_km)) {
          rowErrors.push(`Invalid distance: ${row.distance_km}. Must be a number`);
        } else if (row.distance_km < 0) {
          rowErrors.push(`Invalid distance: ${row.distance_km}. Must be positive`);
        } else if (row.distance_km > 10000) {
          rowErrors.push(`Distance too high: ${row.distance_km}. Maximum is 10,000 km`);
        }
      }

      // Collect errors or add to valid data
      if (rowErrors.length > 0) {
        const errorMessage = `Line ${lineNumber} (${row.name || 'Unknown'}): ${rowErrors.join(', ')}`;
        errors.push(errorMessage);
      } else {
        // Clean and format the data
        const cleanedRow: SuburbImportData = {
          name: this.titleCase(row.name.trim()),
          state: row.state.toUpperCase(),
          postcode: row.postcode.trim(),
          delivery_rate: parseFloat(row.delivery_rate).toFixed(2),
          distance_km: row.distance_km,
          is_active: row.is_active ?? true,
        };
        validData.push(cleanedRow);
      }
    });

    // Check for duplicates within the import data
    const seenCombinations = new Set<string>();
    const duplicateErrors: string[] = [];

    validData.forEach((row, index) => {
      const key = `${row.name.toLowerCase()}-${row.postcode}`;
      if (seenCombinations.has(key)) {
        duplicateErrors.push(`Duplicate in import: ${row.name} (${row.postcode})`);
      } else {
        seenCombinations.add(key);
      }
    });

    return {
      validData: validData.filter((row, index) => {
        const key = `${row.name.toLowerCase()}-${row.postcode}`;
        return validData.findIndex(r => `${r.name.toLowerCase()}-${r.postcode}` === key) === index;
      }),
      errors: [...errors, ...duplicateErrors],
    };
  }

  private static titleCase(str: string): string {
    return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
}