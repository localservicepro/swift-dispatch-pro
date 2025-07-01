
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ImportData {
  business_name: string;
  delivery_address: string;
  suburb_id?: string;
  suburb_name?: string;
  postcode?: string;
}

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CustomerImportDialog({ isOpen, onClose, onSuccess }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportData[]>([]);
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      parseCSV(uploadedFile);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        toast({
          title: "Error",
          description: "CSV file is empty",
          variant: "destructive",
        });
        return;
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      console.log('CSV Headers:', headers);
      
      // Parse data rows
      const data: ImportData[] = [];
      const parseErrors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        
        if (values.length === 0 || values.every(v => !v)) continue;

        const row: ImportData = {
          business_name: '',
          delivery_address: ''
        };

        // Map columns based on header names
        headers.forEach((header, index) => {
          const value = values[index] || '';
          
          if (header.includes('business') || header.includes('company') || header.includes('name')) {
            row.business_name = value;
          } else if (header.includes('address') || header.includes('delivery')) {
            row.delivery_address = value;
          } else if (header.includes('suburb') && !header.includes('id')) {
            row.suburb_name = value;
          } else if (header.includes('postcode') || header.includes('post')) {
            row.postcode = value;
          } else if (header.includes('suburb_id')) {
            row.suburb_id = value;
          }
        });

        // Validate required fields
        if (!row.business_name) {
          parseErrors.push(`Row ${i + 1}: Business name is required`);
          continue;
        }
        if (!row.delivery_address) {
          parseErrors.push(`Row ${i + 1}: Delivery address is required`);
          continue;
        }

        // Try to match suburb by name or postcode if suburb_id not provided
        if (!row.suburb_id && (row.suburb_name || row.postcode)) {
          const matchedSuburb = suburbs.find(s => 
            (row.suburb_name && s.name.toLowerCase() === row.suburb_name.toLowerCase()) ||
            (row.postcode && s.postcode === row.postcode)
          );
          
          if (matchedSuburb) {
            row.suburb_id = matchedSuburb.id;
          }
        }

        data.push(row);
      }

      setImportData(data);
      setErrors(parseErrors);
      
      toast({
        title: "CSV Parsed",
        description: `Found ${data.length} records to import${parseErrors.length > 0 ? ` with ${parseErrors.length} errors` : ''}`,
      });
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (importData.length === 0) {
      toast({
        title: "No Data",
        description: "Please upload a CSV file first",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;
    const importErrors: string[] = [];

    try {
      for (const row of importData) {
        try {
          const customerData = {
            company_name: row.business_name,
            business_name: row.business_name,
            full_address: row.delivery_address,
            customer_type: 'account',
            entity_type: 'business',
            suburb_id: row.suburb_id || null,
            is_active: true
          };

          const { error } = await supabase
            .from('customers')
            .insert([customerData]);

          if (error) {
            throw error;
          }

          successCount++;
        } catch (error: any) {
          errorCount++;
          importErrors.push(`${row.business_name}: ${error.message}`);
          console.error('Import error for row:', row, error);
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
        setErrors(importErrors);
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

  const downloadTemplate = () => {
    const csvContent = `business_name,delivery_address,suburb_name,postcode
ABC Company Pty Ltd,123 Main Street Brisbane QLD 4000,Brisbane,4000
XYZ Trading Ltd,456 Smith Road Sydney NSW 2000,Sydney,2000`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Account Business Customers</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* File Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Upload CSV File</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Template
              </Button>
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
                  CSV files only. Required columns: business_name, delivery_address
                </p>
              </label>
            </div>
          </div>

          {/* CSV Format Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">CSV Format Requirements:</h4>
            <ul className="text-sm space-y-1 text-gray-600">
              <li>• <strong>business_name</strong> - Required: Company or business name</li>
              <li>• <strong>delivery_address</strong> - Required: Full delivery address</li>
              <li>• <strong>suburb_name</strong> - Optional: Suburb name for automatic matching</li>
              <li>• <strong>postcode</strong> - Optional: Postcode for automatic suburb matching</li>
              <li>• <strong>suburb_id</strong> - Optional: Direct suburb ID if known</li>
            </ul>
          </div>

          {/* Import Preview */}
          {importData.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium">Import Preview ({importData.length} records)</h4>
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Business Name</th>
                      <th className="p-2 text-left">Delivery Address</th>
                      <th className="p-2 text-left">Suburb Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importData.slice(0, 10).map((row, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{row.business_name}</td>
                        <td className="p-2">{row.delivery_address}</td>
                        <td className="p-2">
                          {row.suburb_id ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-3 h-3" />
                              Matched
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-orange-600">
                              <AlertCircle className="w-3 h-3" />
                              No match
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
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
                  <p className="font-medium">Import Errors:</p>
                  <ul className="text-sm space-y-1">
                    {errors.slice(0, 5).map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                    {errors.length > 5 && (
                      <li>... and {errors.length - 5} more errors</li>
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
              disabled={importData.length === 0 || isProcessing}
            >
              {isProcessing ? 'Importing...' : `Import ${importData.length} Customers`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
