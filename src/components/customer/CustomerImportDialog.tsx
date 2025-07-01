
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImportData, ParsedCustomerData, ImportDialogProps } from './types/ImportTypes';
import { ImportDataParser } from './utils/ImportDataParser';
import { ImportDataValidator } from './utils/ImportDataValidator';
import { ImportTemplateGenerator } from './utils/ImportTemplateGenerator';

export function CustomerImportDialog({ isOpen, onClose, onSuccess }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportData[]>([]);
  const [validatedData, setValidatedData] = useState<ParsedCustomerData[]>([]);
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
        const { validData, errors: validationErrors } = ImportDataValidator.validateAndTransform(parsedData, suburbs);
        
        setImportData(parsedData);
        setValidatedData(validData);
        setErrors(validationErrors);
        
        toast({
          title: "CSV Parsed",
          description: `Found ${parsedData.length} records to import${validationErrors.length > 0 ? ` with ${validationErrors.length} errors` : ''}`,
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
    if (validatedData.length === 0) {
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
      for (const item of validatedData) {
        try {
          const { error } = await supabase
            .from('customers')
            .insert([item.customerData]);

          if (error) {
            throw error;
          }

          successCount++;
        } catch (error: any) {
          errorCount++;
          const customerName = item.customerData.company_name || 
                              `${item.customerData.first_name || ''} ${item.customerData.last_name || ''}`.trim() ||
                              'Unknown Customer';
          importErrors.push(`${customerName}: ${error.message}`);
          console.error('Import error for customer:', item.customerData, error);
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

          {/* Import Preview */}
          {importData.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium">Import Preview ({importData.length} records)</h4>
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Name/Company</th>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-left">Contact</th>
                      <th className="p-2 text-left">Address</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importData.slice(0, 10).map((row, index) => {
                      const displayName = row.company_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown';
                      const hasMatchingValidation = validatedData.some((_, validIndex) => validIndex === index);
                      
                      return (
                        <tr key={index} className="border-t">
                          <td className="p-2">{displayName}</td>
                          <td className="p-2">
                            <span className="capitalize">{row.customer_type}</span>
                            {row.entity_type && (
                              <span className="text-gray-500 text-xs ml-1">({row.entity_type})</span>
                            )}
                          </td>
                          <td className="p-2">{row.email || row.phone || '-'}</td>
                          <td className="p-2 truncate max-w-xs">{row.full_address}</td>
                          <td className="p-2">
                            {hasMatchingValidation ? (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-3 h-3" />
                                Valid
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-600">
                                <AlertCircle className="w-3 h-3" />
                                Invalid
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {importData.length > 10 && (
                  <p className="p-2 text-xs text-gray-500 bg-gray-50">
                    ... and {importData.length - 10} more records
                  </p>
                )}
              </div>
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
              disabled={validatedData.length === 0 || isProcessing}
            >
              {isProcessing ? 'Importing...' : `Import ${validatedData.length} Valid Customers`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
