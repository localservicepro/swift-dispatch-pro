import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { SuburbImportParser } from './utils/SuburbImportParser';
import { SuburbImportValidator } from './utils/SuburbImportValidator';
import { SuburbImportTemplate } from './utils/SuburbImportTemplate';
import { supabase } from '@/integrations/supabase/client';

interface SuburbImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedSuburbData {
  name: string;
  state: string;
  postcode: string;
  delivery_rate: string;
  distance_km?: number;
  is_active?: boolean;
}

export function SuburbImportDialog({ isOpen, onClose, onSuccess }: SuburbImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedSuburbData[]>([]);
  const [validData, setValidData] = useState<ParsedSuburbData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      try {
        const parsed = await SuburbImportParser.parseCSV(uploadedFile);
        const { validData: validated, errors: validationErrors } = SuburbImportValidator.validate(parsed);
        
        setParsedData(parsed);
        setValidData(validated);
        setErrors(validationErrors);
        
        toast({
          title: "CSV Parsed",
          description: `Found ${parsed.length} records, ${validated.length} valid${validationErrors.length > 0 ? `, ${validationErrors.length} errors` : ''}`,
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
    if (validData.length === 0) {
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
      for (const suburb of validData) {
        try {
          const { error } = await supabase
            .from('suburbs')
            .insert([{
              name: suburb.name,
              state: suburb.state,
              postcode: suburb.postcode,
              delivery_rate: suburb.delivery_rate,
              distance_km: suburb.distance_km || null,
              is_active: suburb.is_active ?? true,
            }]);

          if (error) {
            // Check if it's a duplicate
            if (error.code === '23505') {
              importErrors.push(`${suburb.name} (${suburb.postcode}): Duplicate entry`);
            } else {
              throw error;
            }
            errorCount++;
          } else {
            successCount++;
          }
        } catch (error: any) {
          errorCount++;
          importErrors.push(`${suburb.name}: ${error.message}`);
          console.error('Import error for suburb:', suburb, error);
        }
      }

      toast({
        title: "Import Complete",
        description: `Successfully imported ${successCount} suburbs${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Suburbs</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* File Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Upload CSV File</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={SuburbImportTemplate.downloadTemplate}
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
                  CSV files only. Required: name, state, postcode, delivery_rate
                </p>
              </label>
            </div>
          </div>

          {/* CSV Format Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">CSV Format Requirements:</h4>
            <div className="text-sm space-y-2 text-gray-600">
              <div>
                <strong>Required Fields:</strong>
                <ul className="ml-4 mt-1">
                  <li>• <strong>name</strong> - Suburb name</li>
                  <li>• <strong>state</strong> - Australian state (NSW, VIC, QLD, etc.)</li>
                  <li>• <strong>postcode</strong> - 4-digit Australian postcode</li>
                  <li>• <strong>delivery_rate</strong> - Delivery fee (e.g., "25.00")</li>
                </ul>
              </div>
              <div>
                <strong>Optional Fields:</strong>
                <ul className="ml-4 mt-1">
                  <li>• <strong>distance_km</strong> - Distance from depot in kilometers</li>
                  <li>• <strong>is_active</strong> - true/false (defaults to true)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Import Statistics */}
          {parsedData.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Import Summary</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>Total Records: <strong>{parsedData.length}</strong></div>
                <div>Valid Records: <strong className="text-green-600">{validData.length}</strong></div>
                <div>Errors: <strong className="text-red-600">{errors.length}</strong></div>
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Import Errors:</p>
                  <ul className="text-sm space-y-1">
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

          {/* Preview Table */}
          {validData.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Valid Records Preview ({validData.length})</h4>
              <ScrollArea className="h-64 rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Postcode</TableHead>
                      <TableHead>Delivery Rate</TableHead>
                      <TableHead>Distance (km)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validData.slice(0, 50).map((suburb, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{suburb.name}</TableCell>
                        <TableCell>{suburb.state}</TableCell>
                        <TableCell>{suburb.postcode}</TableCell>
                        <TableCell>${suburb.delivery_rate}</TableCell>
                        <TableCell>{suburb.distance_km || '-'}</TableCell>
                        <TableCell>{suburb.is_active ? 'Active' : 'Inactive'}</TableCell>
                      </TableRow>
                    ))}
                    {validData.length > 50 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500">
                          ... and {validData.length - 50} more records
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={validData.length === 0 || isProcessing}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Import {validData.length} Suburbs
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}