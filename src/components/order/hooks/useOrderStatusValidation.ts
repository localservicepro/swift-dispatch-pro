import { useState, useEffect } from "react";

interface UseOrderStatusValidationProps {
  currentStatus: string;
  paymentStatus?: string;
  userRole?: string;
}

interface StatusValidation {
  canEdit: boolean;
  canEditProducts: boolean;
  canEditPricing: boolean;
  canChangeStatus: boolean;
  warnings: string[];
  restrictions: string[];
}

export function useOrderStatusValidation({
  currentStatus,
  paymentStatus,
  userRole = 'admin'
}: UseOrderStatusValidationProps): StatusValidation {
  const [validation, setValidation] = useState<StatusValidation>({
    canEdit: true,
    canEditProducts: true,
    canEditPricing: true,
    canChangeStatus: true,
    warnings: [],
    restrictions: []
  });

  useEffect(() => {
    const warnings: string[] = [];
    const restrictions: string[] = [];
    
    // Admin users can edit any order, but we provide warnings
    const canEdit = userRole === 'admin';
    const canEditProducts = userRole === 'admin';
    const canEditPricing = userRole === 'admin';
    const canChangeStatus = userRole === 'admin';

    // Add warnings based on order status
    if (['delivered', 'completed'].includes(currentStatus)) {
      warnings.push('This order has been completed. Changes will affect historical records.');
    }

    if (paymentStatus === 'paid') {
      warnings.push('This order has been paid. Price changes may require payment adjustments.');
    }

    if (currentStatus === 'cancelled') {
      warnings.push('This order has been cancelled. Consider restoring before making changes.');
    }

    if (['preparing', 'loading', 'en_route'].includes(currentStatus)) {
      warnings.push('This order is in progress. Changes may affect delivery schedules.');
    }

    // Add informational restrictions (though admin can override)
    if (currentStatus === 'delivered' && paymentStatus === 'paid') {
      restrictions.push('Best practice: Create a return/credit instead of modifying completed paid orders.');
    }

    setValidation({
      canEdit,
      canEditProducts,
      canEditPricing,
      canChangeStatus,
      warnings,
      restrictions
    });
  }, [currentStatus, paymentStatus, userRole]);

  return validation;
}