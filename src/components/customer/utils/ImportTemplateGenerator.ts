
export class ImportTemplateGenerator {
  static generateMixedTemplate(): string {
    return `customer_type,entity_type,first_name,last_name,company_name,email,phone,full_address,suburb_name,postcode,contact_role
trade,individual,John,Smith,,john@email.com,0400123456,123 Main St Brisbane QLD 4000,Brisbane,4000,
account,business,Jane,Doe,ABC Company,jane@abc.com,0400987654,456 Business Ave Sydney NSW 2000,Sydney,2000,Manager
residential,individual,Bob,Jones,,bob@email.com,0400555123,789 Home St Melbourne VIC 3000,Melbourne,3000,`;
  }

  static generateBusinessTemplate(): string {
    return `company_name,contact_first_name,contact_last_name,email,phone,full_address,customer_type,suburb_name,postcode,contact_role
ABC Company,Jane,Doe,jane@abc.com,0400987654,456 Business Ave Sydney NSW 2000,account,Sydney,2000,Manager
XYZ Trading,John,Smith,john@xyz.com,0400111222,789 Commerce St Brisbane QLD 4000,trade,Brisbane,4000,Director`;
  }

  static generateIndividualTemplate(): string {
    return `first_name,last_name,email,phone,full_address,customer_type,suburb_name,postcode
John,Smith,john@email.com,0400123456,123 Main St Brisbane QLD 4000,trade,Brisbane,4000
Sarah,Johnson,sarah@email.com,0400987654,456 Park Ave Sydney NSW 2000,residential,Sydney,2000`;
  }

  static downloadTemplate(templateType: 'mixed' | 'business' | 'individual' = 'mixed'): void {
    let csvContent: string;
    let filename: string;

    switch (templateType) {
      case 'business':
        csvContent = this.generateBusinessTemplate();
        filename = 'customer_import_business_template.csv';
        break;
      case 'individual':
        csvContent = this.generateIndividualTemplate();
        filename = 'customer_import_individual_template.csv';
        break;
      default:
        csvContent = this.generateMixedTemplate();
        filename = 'customer_import_mixed_template.csv';
        break;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
