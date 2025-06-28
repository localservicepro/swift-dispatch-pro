
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

interface PurchaseOrderDisplayProps {
  purchaseOrder?: string | null;
  className?: string;
  showIcon?: boolean;
  variant?: 'default' | 'secondary' | 'outline';
}

export function PurchaseOrderDisplay({ 
  purchaseOrder, 
  className = "", 
  showIcon = true,
  variant = 'secondary'
}: PurchaseOrderDisplayProps) {
  if (!purchaseOrder) {
    return null;
  }

  return (
    <Badge 
      variant={variant} 
      className={`flex items-center gap-1 ${className}`}
    >
      {showIcon && <FileText className="w-3 h-3" />}
      <span className="text-xs font-medium">PO: {purchaseOrder}</span>
    </Badge>
  );
}
