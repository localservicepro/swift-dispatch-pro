
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { PurchaseOrderDisplay } from './PurchaseOrderDisplay';
import { formatOrderNumber } from '@/utils/orderNumberFormatter';
import { cleanDisplayName } from './services/orderFormattingService';

interface OrderEditHeaderProps {
  orderNumber: string;
  purchaseOrder?: string;
  customerName: string;
  customerType?: string;
  companyName?: string;
}

export function OrderEditHeader({ orderNumber, purchaseOrder, customerName, customerType, companyName }: OrderEditHeaderProps) {
  const cleanedCompany = cleanDisplayName(companyName);
  const cleanedCustomer = cleanDisplayName(customerName);
  const displayName = customerType === 'account' && cleanedCompany ? cleanedCompany : (cleanedCustomer || cleanedCompany || 'Customer');
  return (
    <div className="space-y-2 pb-4 border-b">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-slate-800">Edit Order</h2>
        <Badge variant="outline" className="text-sm">
          {formatOrderNumber({ order_number: orderNumber, master_order_id: undefined, is_split_order: false })}
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
