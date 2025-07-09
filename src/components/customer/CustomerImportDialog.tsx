
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ImportData, ParsedCustomerData, ImportDialogProps, ImportPreviewData } from './types/ImportTypes';
import { ImportDataParser } from './utils/ImportDataParser';
import { ImportDataValidator } from './utils/ImportDataValidator';
import { ImportTemplateGenerator } from './utils/ImportTemplateGenerator';

export function CustomerImportDialog({ isOpen, onClose, onSuccess }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportData[]>([]);
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [suburbs, setSuburbs] = useState<any[]>([]);
  const { toast } = useToast();

  // Load suburbs for matching
  React.useEffect(() => {
    if (isOpen) {
      fetchSuburbs();
    }
  }, [isOpen]);

  const fetchSuburbs = async () => {
    try {
      const { data, error } = await supabase
        .from('suburbs')
        .select('id, name, postcode, state')
        .eq('is_active', true);
      
      if (error) throw error;
      setSuburbs(data || []);
    } catch (error) {
      console.error('Error fetching suburbs:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      try {
        const parsedData = await ImportDataParser.parseCSV(uploadedFile);
        const { previewData: consolidatedData, errors: validationErrors } = ImportDataValidator.validateAndConsolidate(parsedData, suburbs);
        
        setImportData(parsedData);
        setPreviewData(consolidatedData);
        setErrors(validationErrors);
        
        const totalValidItems = consolidatedData.consolidatedCompanies.length + consolidatedData.individualCustomers.length;
        const companyCount = consolidatedData.consolidatedCompanies.length;
        const individualCount = consolidatedData.individualCustomers.length;
        
        toast({
          title: "CSV Parsed & Consolidated",
          description: `Found ${parsedData.length} records, consolidated into ${totalValidItems} customers (${companyCount} companies, ${individualCount} individuals)${validationErrors.length > 0 ? ` with ${validationErrors.length} errors` : ''}`,
        });
      } catch (error) {
        console.error('Parse error:', error);
        toast({
          title: "Parse Error",
          description: error instanceof Error ? error.message : "Failed to parse CSV file",
          variant: "destructive",
        });
      }
    }
  };

  const handleImport = async () => {
    if (!previewData || (previewData.consolidatedCompanies.length === 0 && previewData.individualCustomers.length === 0)) {
      toast({
        title: "No Valid Data",
        description: "Please upload a valid CSV file first",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;
    const importErrors: string[] = [];

    try {
      // Import consolidated companies
      for (const company of previewData.consolidatedCompanies) {
        try {
          // Insert main customer record
          const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .insert([company.customerData])
            .select()
            .single();

          if (customerError) {
            throw customerError;
          }

          // Insert additional contacts if any
          if (company.additionalContacts.length > 0) {
            const contactsWithCustomerId = company.additionalContacts.map(contact => ({
              ...contact,
              customer_id: customerData.id
            }));

            const { error: contactsError } = await supabase
              .from('customer_contacts')
              .insert(contactsWithCustomerId);

            if (contactsError) {
              console.warn('Failed to insert some contacts:', contactsError);
            }
          }

          successCount++;
        } catch (error: any) {
          errorCount++;
          const customerName = company.customerData.company_name || 
                              `${company.customerData.first_name || ''} ${company.customerData.last_name || ''}`.trim() ||
                              'Unknown Customer';
          importErrors.push(`${customerName}: ${error.message}`);
          console.error('Import error for company:', company.customerData, error);
        }
      }

      // Import individual customers
      for (const individual of previewData.individualCustomers) {
        try {
          const { error } = await supabase
            .from('customers')
            .insert([individual.customerData]);

          if (error) {
            throw error;
          }

          successCount++;
        } catch (error: any) {
          errorCount++;
          const customerName = individual.customerData.company_name || 
                              `${individual.customerData.first_name || ''} ${individual.customerData.last_name || ''}`.trim() ||
                              'Unknown Customer';
          importErrors.push(`${customerName}: ${error.message}`);
          console.error('Import error for customer:', individual.customerData, error);
        }
      }

      toast({
        title: "Import Complete",
        description: `Successfully imported ${successCount} customers${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        variant: successCount > 0 ? "default" : "destructive",
      });

      if (successCount > 0) {
        onSuccess();
        if (errorCount === 0) {
          onClose();
        }
      }

      if (importErrors.length > 0) {
        setErrors(prev => [...prev, ...importErrors]);
      }

    } catch (error) {
      console.error('Import process error:', error);
      toast({
        title: "Import Failed",
        description: "An error occurred during the import process",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getCustomerTypeStats = () => {
    const stats = { trade: 0, account: 0, residential: 0 };
    importData.forEach(item => {
      if (item.customer_type && stats.hasOwnProperty(item.customer_type)) {
        stats[item.customer_type]++;
      }
    });
    return stats;
  };

  const stats = getCustomerTypeStats();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Customers</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* File Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Upload CSV File</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => ImportTemplateGenerator.downloadTemplate('mixed')}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Mixed Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => ImportTemplateGenerator.downloadTemplate('business')}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Business Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => ImportTemplateGenerator.downloadTemplate('individual')}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Individual Template
                </Button>
              </div>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Click to upload CSV file or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  CSV files only. Supports all customer types (Trade, Account, Residential)
                </p>
              </label>
            </div>
          </div>

          {/* CSV Format Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Supported CSV Formats:</h4>
            <div className="text-sm space-y-2 text-gray-600">
              <div>
                <strong>Required Fields:</strong>
                <ul className="ml-4 mt-1">
                  <li>• <strong>full_address</strong> - Complete address for delivery</li>
                </ul>
              </div>
              <div>
                <strong>Individual Customers:</strong>
                <ul className="ml-4 mt-1">
                  <li>• <strong>first_name, last_name</strong> - Personal names</li>
                  <li>• <strong>customer_type</strong> - trade, account, or residential</li>
                </ul>
              </div>
              <div>
                <strong>Business Customers:</strong>
                <ul className="ml-4 mt-1">
                  <li>• <strong>company_name</strong> - Business name</li>
                  <li>• <strong>contact_first_name, contact_last_name</strong> - Contact person</li>
                  <li>• <strong>contact_role</strong> - Job title/position</li>
                </ul>
              </div>
              <div>
                <strong>Optional Fields:</strong> email, phone, suburb_name, postcode, suburb_id
              </div>
            </div>
          </div>

          {/* Import Statistics */}
          {importData.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Import Summary</h4>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>Total Records: <strong>{importData.length}</strong></div>
                <div>Trade: <strong>{stats.trade}</strong></div>
                <div>Account: <strong>{stats.account}</strong></div>
                <div>Residential: <strong>{stats.residential}</strong></div>
              </div>
            </div>
          )}

          {/* Consolidation Preview */}
          {previewData && (
            <div className="space-y-4">
              <h4 className="font-medium">
                Consolidated Import Preview 
                ({previewData.consolidatedCompanies.length + previewData.individualCustomers.length} customers from {previewData.totalOriginalRows} records)
              </h4>
              
              {/* Company Consolidations */}
              {previewData.consolidatedCompanies.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-blue-600">Companies ({previewData.consolidatedCompanies.length})</h5>
                  <ScrollArea className="h-40 rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-blue-50">
                          <TableHead className="min-w-[200px]">Company</TableHead>
                          <TableHead className="min-w-[180px]">Primary Contact</TableHead>
                          <TableHead className="min-w-[120px]">Type</TableHead>
                          <TableHead className="min-w-[150px]">Email</TableHead>
                          <TableHead className="min-w-[120px]">Phone</TableHead>
                          <TableHead className="min-w-[120px]">Additional Contacts</TableHead>
                          <TableHead className="min-w-[300px]">Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.consolidatedCompanies.map((company, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{company.customerData.company_name}</TableCell>
                            <TableCell>
                              {`${company.customerData.first_name || ''} ${company.customerData.last_name || ''}`.trim() || 'N/A'}
                              {company.customerData.contact_role && (
                                <div className="text-gray-500 text-xs">{company.customerData.contact_role}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="capitalize">{company.customerData.customer_type}</span>
                            </TableCell>
                            <TableCell>{company.customerData.email || '-'}</TableCell>
                            <TableCell>{company.customerData.phone || '-'}</TableCell>
                            <TableCell>
                              {company.additionalContacts.length > 0 ? (
                                <span className="text-green-600">{company.additionalContacts.length} contacts</span>
                              ) : (
                                <span className="text-gray-400">None</span>
                              )}
                            </TableCell>
                            <TableCell>{company.customerData.full_address}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              )}

              {/* Individual Customers */}
              {previewData.individualCustomers.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-green-600">Individual Customers ({previewData.individualCustomers.length})</h5>
                  <ScrollArea className="h-40 rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-green-50">
                          <TableHead className="min-w-[200px]">Name</TableHead>
                          <TableHead className="min-w-[120px]">Type</TableHead>
                          <TableHead className="min-w-[150px]">Email</TableHead>
                          <TableHead className="min-w-[120px]">Phone</TableHead>
                          <TableHead className="min-w-[300px]">Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.individualCustomers.map((customer, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {`${customer.customerData.first_name || ''} ${customer.customerData.last_name || ''}`.trim() || 'Unknown'}
                            </TableCell>
                            <TableCell>
                              <span className="capitalize">{customer.customerData.customer_type}</span>
                            </TableCell>
                            <TableCell>{customer.customerData.email || '-'}</TableCell>
                            <TableCell>{customer.customerData.phone || '-'}</TableCell>
                            <TableCell>{customer.customerData.full_address}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Import Errors ({errors.length}):</p>
                  <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                    {errors.slice(0, 10).map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                    {errors.length > 10 && (
                      <li>... and {errors.length - 10} more errors</li>
                    )}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!previewData || (previewData.consolidatedCompanies.length === 0 && previewData.individualCustomers.length === 0) || isProcessing}
            >
              {isProcessing ? 'Importing...' : 
                previewData ? `Import ${previewData.consolidatedCompanies.length + previewData.individualCustomers.length} Customers` : 'Import Customers'
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
