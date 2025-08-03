
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrderFormData } from "./hooks/useOrderFormData";
import { useConflictDetection } from "./hooks/useConflictDetection";
import { ConflictResult } from "@/utils/conflictDetection";
import { Order, ConflictInfo } from "./OrderEditFormTypes";

// Helper function to convert ConflictResult to ConflictInfo
export const convertToConflictInfo = (conflictResult?: ConflictResult): ConflictInfo => {
  if (!conflictResult || !conflictResult.hasConflict) {
    return { hasConflict: false };
  }

  // Map conflict types from ConflictResult to ConflictInfo format
  let conflictType: 'exact' | 'overlap' | 'adjacent';
  switch (conflictResult.conflictType) {
    case 'exact':
      conflictType = 'exact';
      break;
    case 'overlap':
      conflictType = 'overlap';
      break;
    case 'same-day':
      conflictType = 'adjacent'; // Map same-day to adjacent
      break;
    default:
      conflictType = 'adjacent'; // Default fallback
      break;
  }

  return {
    hasConflict: conflictResult.hasConflict,
    conflictType
  };
};

export function useOrderEditFormLogic(order: Order) {
  const [deliveryRate, setDeliveryRate] = useState<string>('');
  
  const {
    formData,
    setFormData,
    handleInputChange,
    handleDriverChange,
    handleSuburbChange,
    handleDeliverySuburbChange,
    handleFormDataChange: handleFormDataChangeHook,
    handleProductsChange,
    handleSubtotalChange,
    handleContactChange,
    getFormDataForSubmission,
    getCalculationBreakdown,
    paymentSettings
  } = useOrderFormData(order);

  // Use conflict detection hook
  const {
    driverConflict,
    truckConflict,
    isChecking,
    hasAnyConflict
  } = useConflictDetection(
    formData.delivery_date,
    formData.delivery_time,
    formData.driver_id,
    formData.truck_id,
    order.id
  );

  // Fetch delivery rate when delivery suburb changes
  useEffect(() => {
    const fetchDeliveryRate = async () => {
      // Use delivery_suburb_id if available, otherwise fall back to suburb_id
      const suburbId = formData.delivery_suburb_id || formData.suburb_id;
      if (suburbId) {
        const { data, error } = await supabase
          .from('suburbs')
          .select('delivery_rate')
          .eq('id', suburbId)
          .single();

        if (error) {
          console.error("Error fetching suburb:", error);
        } else if (data) {
          setDeliveryRate(data.delivery_rate);
        }
      }
    };

    fetchDeliveryRate();
  }, [formData.delivery_suburb_id, formData.suburb_id]);

  // Reset truck selection when truck type changes
  useEffect(() => {
    if (formData.truck_type !== order.truck_type) {
      setFormData(prev => ({ ...prev, truck_id: 'none' }));
    }
  }, [formData.truck_type, order.truck_type, setFormData]);

  const handleFormDataChange = (updates: any) => {
    console.log('OrderEditFormLogic - handleFormDataChange called with:', updates);
    if (updates.full_address !== undefined) {
      handleInputChange('customer_address', updates.full_address);
    }
    if (updates.suburb_id !== undefined) {
      handleSuburbChange(updates.suburb_id);
    }
    // Handle delivery suburb changes
    if (updates.delivery_suburb_id !== undefined) {
      handleFormDataChangeHook({ delivery_suburb_id: updates.delivery_suburb_id });
    }
  };

  // Get calculation breakdown for UI display
  const calculationBreakdown = getCalculationBreakdown();

  return {
    formData,
    deliveryRate,
    driverConflict,
    truckConflict,
    isChecking,
    hasAnyConflict,
    handleInputChange,
    handleDriverChange,
    handleSuburbChange,
    handleDeliverySuburbChange,
    handleProductsChange,
    handleSubtotalChange,
    handleContactChange,
    handleFormDataChange,
    getFormDataForSubmission,
    calculationBreakdown,
    paymentSettings
  };
}
