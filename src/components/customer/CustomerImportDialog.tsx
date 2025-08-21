
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
import { debugLogger } from '@/utils/debugLogger';

export function CustomerImportDialog({ isOpen, onClose, onSuccess }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportData[]>([]);
  const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [suburbs, setSuburbs] = useState<any[]>([]);
  
  // Progress tracking state
  const [importProgress, setImportProgress] = useState(0);
  const [totalToImport, setTotalToImport] = useState(0);
  const [currentlyImporting, setCurrentlyImporting] = useState('');
  
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
    const total = previewData.consolidatedCompanies.length + previewData.individualCustomers.length;
    setTotalToImport(total);
    setImportProgress(0);
    setCurrentlyImporting('');
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const importErrors: string[] = [];
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    debugLogger.log('Customer import started', { total, companies: previewData.consolidatedCompanies.length, individuals: previewData.individualCustomers.length, userId: user?.id });
    if (userError) {
      debugLogger.error('Failed to get current user', userError);
    }

    try {
      // Import consolidated companies
      for (const company of previewData.consolidatedCompanies) {
        const customerName = company.customerData.company_name || 
                            `${company.customerData.first_name || ''} ${company.customerData.last_name || ''}`.trim() ||
                            'Unknown Customer';
        setCurrentlyImporting(customerName);
        
        try {
          let customerData;
          
          // Check if customer already exists by email
          if (company.customerData.email) {
            const { data: existingCustomer } = await supabase
              .from('customers')
              .select('id, email')
              .eq('email', company.customerData.email)
              .maybeSingle();

            if (existingCustomer) {
              // Update existing customer
              const { data: updatedCustomer, error: updateError } = await supabase
                .from('customers')
                .update(company.customerData)
                .eq('id', existingCustomer.id)
                .select()
                .single();

              if (updateError) throw updateError;
              customerData = updatedCustomer;
            } else {
              // Insert new customer
              const newCustomerPayload = {
                ...company.customerData,
                auth_user_id: (company.customerData as any).auth_user_id ?? user?.id ?? null
              };
              debugLogger.apiCall('customers', 'INSERT', 'start', newCustomerPayload);
              const { data: newCustomer, error: insertError } = await supabase
                .from('customers')
                .insert([newCustomerPayload])
                .select()
                .single();

              if (insertError) {
                debugLogger.error('Insert customer failed', insertError, { payload: newCustomerPayload });
                throw insertError;
              }
              customerData = newCustomer;

            }
          } else {
            // No email provided, try direct insert
            const newCustomerPayload = {
              ...company.customerData,
              auth_user_id: (company.customerData as any).auth_user_id ?? user?.id ?? null
            };
            debugLogger.apiCall('customers', 'INSERT', 'start', newCustomerPayload);
            const { data: newCustomer, error: insertError } = await supabase
              .from('customers')
              .insert([newCustomerPayload])
              .select()
              .single();

            if (insertError) {
              debugLogger.error('Insert customer failed', insertError, { payload: newCustomerPayload });
              throw insertError;
            }
            customerData = newCustomer;
          }

          // Insert additional contacts if any
          if (company.additionalContacts.length > 0) {
            for (const contact of company.additionalContacts) {
              const contactWithCustomerId = {
                ...contact,
                customer_id: customerData.id
              };

              // Check if contact already exists
              if (contact.email) {
                const { data: existingContact } = await supabase
                  .from('customer_contacts')
                  .select('id')
                  .eq('customer_id', customerData.id)
                  .eq('email', contact.email)
                  .maybeSingle();

                if (!existingContact) {
                  const contactPayload = {
                    ...contactWithCustomerId,
                    first_name: contactWithCustomerId.first_name || 'Contact',
                    last_name: contactWithCustomerId.last_name || 'Contact',
                  };
                  debugLogger.apiCall('customer_contacts', 'INSERT', 'start', { email: contactPayload.email, customer_id: contactPayload.customer_id });
                  const { error: contactError } = await supabase
                    .from('customer_contacts')
                    .insert([contactPayload]);

                  if (contactError) {
                    debugLogger.error('Failed to insert contact', contactError, { payload: contactPayload });
                    importErrors.push(`${customerName} contact (${contactPayload.email || contactPayload.first_name}): ${contactError.message}`);
                  }
                }
              } else {
                // Insert contact without email check
                const { error: contactError } = await supabase
                  .from('customer_contacts')
                  .insert([contactWithCustomerId]);

                if (contactError && !contactError.message.includes('duplicate key')) {
                  console.warn('Failed to insert contact:', contactError);
                }
              }
            }
          }

          successCount++;
        } catch (error: any) {
          errorCount++;
          const errorMsg = error.message.includes('duplicate key') 
            ? 'Customer with this email already exists'
            : error.message;
          importErrors.push(`${customerName}: ${errorMsg}`);
          console.error('Import error for company:', company.customerData, error);
        }
        
        setImportProgress(successCount + errorCount);
      }

      // Import individual customers
      for (const individual of previewData.individualCustomers) {
        const customerName = individual.customerData.company_name || 
                            `${individual.customerData.first_name || ''} ${individual.customerData.last_name || ''}`.trim() ||
                            'Unknown Customer';
        setCurrentlyImporting(customerName);
        
        try {
          // Check if customer already exists by email
          if (individual.customerData.email) {
            const { data: existingCustomer } = await supabase
              .from('customers')
              .select('id, email')
              .eq('email', individual.customerData.email)
              .maybeSingle();

            if (existingCustomer) {
              // Update existing customer
              const { error: updateError } = await supabase
                .from('customers')
                .update(individual.customerData)
                .eq('id', existingCustomer.id);
              debugLogger.apiCall('customers', 'UPDATE', 'success', { id: existingCustomer.id });

              if (updateError) throw updateError;
            } else {
              // Insert new customer
                const newCustomerPayload = {
                  ...individual.customerData,
                  auth_user_id: (individual.customerData as any).auth_user_id ?? user?.id ?? null
                };
                debugLogger.apiCall('customers', 'INSERT', 'start', newCustomerPayload);
                const { error: insertError } = await supabase
                  .from('customers')
                  .insert([newCustomerPayload]);

              if (insertError) throw insertError;
            }
          } else {
            // No email provided, try direct insert
            const newCustomerPayload = {
              ...individual.customerData,
              auth_user_id: (individual.customerData as any).auth_user_id ?? user?.id ?? null
            };
            debugLogger.apiCall('customers', 'INSERT', 'start', newCustomerPayload);
            const { error: insertError } = await supabase
              .from('customers')
              .insert([newCustomerPayload]);

            if (insertError) throw insertError;
          }

          successCount++;
        } catch (error: any) {
          errorCount++;
          const errorMsg = error.message.includes('duplicate key') 
            ? 'Customer with this email already exists'
            : error.message;
          importErrors.push(`${customerName}: ${errorMsg}`);
          console.error('Import error for customer:', individual.customerData, error);
        }
        
        setImportProgress(successCount + errorCount);
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
      setCurrentlyImporting('');
      setImportProgress(0);
      setTotalToImport(0);
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
               <div className="text-amber-600 text-xs mt-2">
                 <strong>Note:</strong> Fields marked with * are not found in the delivery suburbs database but will be imported as-is.
               </div>
             </div>
           </div>

          {/* Progress Tracking */}
          {isProcessing && (
            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Import Progress</h4>
                <span className="text-sm text-gray-600">
                  {Math.round((importProgress / totalToImport) * 100)}% ({importProgress}/{totalToImport})
                </span>
              </div>
              <Progress value={(importProgress / totalToImport) * 100} className="w-full" />
              {currentlyImporting && (
                <p className="text-sm text-gray-600">
                  Currently importing: <span className="font-medium">{currentlyImporting}</span>
                </p>
              )}
            </div>
          )}

          {/* Import Statistics */}
          {importData.length > 0 && !isProcessing && (
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
                          <TableHead className="min-w-[100px]">Role</TableHead>
                          <TableHead className="min-w-[120px]">Type</TableHead>
                          <TableHead className="min-w-[150px]">Email</TableHead>
                          <TableHead className="min-w-[120px]">Phone</TableHead>
                          <TableHead className="min-w-[120px]">Suburb</TableHead>
                          <TableHead className="min-w-[100px]">Postcode</TableHead>
                          <TableHead className="min-w-[120px]">Additional Contacts</TableHead>
                          <TableHead className="min-w-[300px]">Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.consolidatedCompanies.map((company, index) => {
                          // Find suburb info for display
                          const suburb = company.customerData.suburb_id ? 
                            suburbs.find(s => s.id === company.customerData.suburb_id) : null;
                          
                          // Use raw suburb data if database lookup failed
                          const suburbDisplay = suburb?.name || company.rawSuburbData?.suburb_name || '-';
                          const postcodeDisplay = suburb?.postcode || company.rawSuburbData?.postcode || '-';
                          
                          return (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{company.customerData.company_name}</TableCell>
                              <TableCell>
                                {`${company.customerData.first_name || ''} ${company.customerData.last_name || ''}`.trim() || 'N/A'}
                              </TableCell>
                              <TableCell>
                                {company.customerData.contact_role || '-'}
                              </TableCell>
                              <TableCell>
                                <span className="capitalize">{company.customerData.customer_type}</span>
                              </TableCell>
                              <TableCell>{company.customerData.email || '-'}</TableCell>
                              <TableCell>{company.customerData.phone || '-'}</TableCell>
                              <TableCell>
                                {suburbDisplay}
                                {company.rawSuburbData?.suburb_name && !company.rawSuburbData.suburbFound && (
                                  <span className="text-amber-600 text-xs ml-1">*</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {postcodeDisplay}
                                {company.rawSuburbData?.postcode && !company.rawSuburbData.suburbFound && (
                                  <span className="text-amber-600 text-xs ml-1">*</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {company.additionalContacts.length > 0 ? (
                                  <span className="text-green-600">{company.additionalContacts.length} contacts</span>
                                ) : (
                                  <span className="text-gray-400">None</span>
                                )}
                              </TableCell>
                              <TableCell>{company.customerData.full_address}</TableCell>
                            </TableRow>
                          );
                        })}
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
                          <TableHead className="min-w-[120px]">Suburb</TableHead>
                          <TableHead className="min-w-[100px]">Postcode</TableHead>
                          <TableHead className="min-w-[300px]">Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.individualCustomers.map((customer, index) => {
                          // Find suburb info for display
                          const suburb = customer.customerData.suburb_id ? 
                            suburbs.find(s => s.id === customer.customerData.suburb_id) : null;
                          
                          // Use raw suburb data if database lookup failed
                          const suburbDisplay = suburb?.name || customer.rawSuburbData?.suburb_name || '-';
                          const postcodeDisplay = suburb?.postcode || customer.rawSuburbData?.postcode || '-';
                          
                          return (
                            <TableRow key={index}>
                              <TableCell>
                                {`${customer.customerData.first_name || ''} ${customer.customerData.last_name || ''}`.trim() || 'Unknown'}
                              </TableCell>
                              <TableCell>
                                <span className="capitalize">{customer.customerData.customer_type}</span>
                              </TableCell>
                              <TableCell>{customer.customerData.email || '-'}</TableCell>
                              <TableCell>{customer.customerData.phone || '-'}</TableCell>
                              <TableCell>
                                {suburbDisplay}
                                {customer.rawSuburbData?.suburb_name && !customer.rawSuburbData.suburbFound && (
                                  <span className="text-amber-600 text-xs ml-1">*</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {postcodeDisplay}
                                {customer.rawSuburbData?.postcode && !customer.rawSuburbData.suburbFound && (
                                  <span className="text-amber-600 text-xs ml-1">*</span>
                                )}
                              </TableCell>
                              <TableCell>{customer.customerData.full_address}</TableCell>
                            </TableRow>
                          );
                        })}
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
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!previewData || isProcessing || (previewData.consolidatedCompanies.length === 0 && previewData.individualCustomers.length === 0)}
            >
              {isProcessing ? `Importing... (${importProgress}/${totalToImport})` : "Import Customers"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
