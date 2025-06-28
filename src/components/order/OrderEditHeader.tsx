
import React from 'react';

interface OrderEditHeaderProps {
  orderNumber: string;
  customerName: string;
}

export function OrderEditHeader({ orderNumber, customerName }: OrderEditHeaderProps) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Edit Order {orderNumber}
      </h2>
      <p className="text-gray-600">
        Customer: {customerName}
      </p>
    </div>
  );
}
