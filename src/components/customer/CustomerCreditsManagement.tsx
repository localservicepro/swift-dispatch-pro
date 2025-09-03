import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Calendar, Trash2 } from 'lucide-react';
import { useCustomerCredits } from '@/hooks/useCustomerCredits';
import { format } from 'date-fns';
import { CreditEditDialog } from './CreditEditDialog';
import { ManualCreditDialog } from './ManualCreditDialog';

interface CustomerCreditsManagementProps {
  customerId: string;
}

export function CustomerCreditsManagement({ customerId }: CustomerCreditsManagementProps) {
  const [editingCredit, setEditingCredit] = useState<any>(null);
  const [showManualCreditDialog, setShowManualCreditDialog] = useState(false);
  
  const { 
    credits, 
    totalAvailableCredit, 
    isLoading, 
    updateCredit, 
    createManualCredit, 
    expireCredit, 
    deleteCredit 
  } = useCustomerCredits(customerId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="default" className="bg-green-100 text-green-800">Available</Badge>;
      case 'used':
        return <Badge variant="secondary">Used</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleExpireCredit = (creditId: string) => {
    if (window.confirm('Are you sure you want to expire this credit?')) {
      expireCredit(creditId);
    }
  };

  const handleDeleteCredit = (creditId: string) => {
    if (window.confirm('Are you sure you want to delete this credit? This action cannot be undone.')) {
      deleteCredit(creditId);
    }
  };

  if (isLoading) {
    return <div>Loading credits...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Customer Credits
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Available</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(totalAvailableCredit)}
              </p>
            </div>
            <Button 
              onClick={() => setShowManualCreditDialog(true)}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Credit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {credits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No credits found for this customer.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credits.map((credit) => (
                  <TableRow key={credit.id}>
                    <TableCell className="font-medium">
                      {formatCurrency(credit.amount)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(credit.status)}
                    </TableCell>
                    <TableCell>
                      {credit.created_from_return_id ? 'Return' : 'Manual'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(credit.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      {credit.expires_at ? (
                        <span className={
                          new Date(credit.expires_at) < new Date() 
                            ? 'text-red-600' 
                            : ''
                        }>
                          {format(new Date(credit.expires_at), 'dd/MM/yyyy')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {credit.description || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {credit.status === 'available' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingCredit(credit)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExpireCredit(credit.id)}
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCredit(credit.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editingCredit && (
        <CreditEditDialog
          credit={editingCredit}
          isOpen={!!editingCredit}
          onClose={() => setEditingCredit(null)}
          onSave={(creditData) => {
            updateCredit({ creditId: editingCredit.id, ...creditData });
            setEditingCredit(null);
          }}
        />
      )}

      <ManualCreditDialog
        customerId={customerId}
        isOpen={showManualCreditDialog}
        onClose={() => setShowManualCreditDialog(false)}
        onSave={(creditData) => {
          createManualCredit(creditData);
          setShowManualCreditDialog(false);
        }}
      />
    </div>
  );
}