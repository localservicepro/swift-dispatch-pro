
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { PurchaseOrderDisplay } from './PurchaseOrderDisplay';

interface OrderEditHeaderProps {
  orderNumber: string;
  purchaseOrder?: string;
  customerName: string;
  contactName?: string;
}

export function OrderEditHeader({ orderNumber, purchaseOrder, customerName, contactName }: OrderEditHeaderProps) {
  // Prioritize contact name over customer name for display
  const displayName = contactName || customerName;

  return (
    <div className="space-y-2 pb-4 border-b">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-slate-800">Edit Order</h2>
        <Badge variant="outline" className="text-sm">
          {orderNumber}
        </Badge>
        <PurchaseOrderDisplay 
          purchaseOrder={purchaseOrder} 
          variant="outline"
        />
      </div>
      <p className="text-slate-600">Customer: <span className="font-medium">{displayName}</span></p>
    </div>
  );
}
