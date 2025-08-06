export class SuburbImportTemplate {
  static downloadTemplate(): void {
    const headers = [
      'name',
      'state',
      'postcode',
      'delivery_rate',
      'distance_km',
      'is_active'
    ];

    const sampleData = [
      ['Bondi Beach', 'NSW', '2026', '35.00', '12.5', 'true'],
      ['Melbourne CBD', 'VIC', '3000', '25.00', '8.0', 'true'],
      ['Surfers Paradise', 'QLD', '4217', '45.00', '25.2', 'true'],
      ['Fremantle', 'WA', '6160', '40.00', '18.7', 'true'],
      ['North Adelaide', 'SA', '5006', '30.00', '10.3', 'false'],
    ];

    this.generateAndDownloadCSV(headers, sampleData, 'suburb_import_template.csv');
  }

  private static generateAndDownloadCSV(headers: string[], data: string[][], filename: string): void {
    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  static getTemplateInstructions(): string {
    return `
CSV Template Instructions:

Required Columns:
- name: Suburb name (e.g., "Bondi Beach")
- state: Australian state code (NSW, VIC, QLD, WA, SA, TAS, NT, ACT)
- postcode: 4-digit Australian postcode (e.g., "2026")
- delivery_rate: Delivery fee in dollars (e.g., "35.00")

Optional Columns:
- distance_km: Distance from depot in kilometers (e.g., "12.5")
- is_active: Whether the suburb is active (true/false, defaults to true)

Notes:
- All text fields should be enclosed in quotes if they contain commas
- Delivery rates should be numeric values (currency symbols will be removed)
- States will be automatically converted to uppercase
- Suburb names will be converted to title case
- Duplicate suburbs (same name + postcode) will be skipped
    `;
  }
}