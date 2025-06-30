
import { useState } from "react";
import { OrderEditFooter } from "./OrderEditFooter";
import { OrderEditSections } from "./OrderEditSections";
import { OrderEditConflictSection } from "./OrderEditConflictSection";
import { OrderEditFormProps } from "./OrderEditFormTypes";
import { useOrderEditFormLogic, convertToConflictInfo } from "./OrderEditFormLogic";
import { useOrderFormSubmission } from "./OrderEditFormSubmission";

export function OrderEditForm({ order, onOrderUpdated, onClose }: OrderEditFormProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { handleOrderSubmission } = useOrderFormSubmission();
  
  const {
    formData,
    deliveryRate,
    driverConflict,
    truckConflict,
    isChecking,
    hasAnyConflict,
    handleInputChange,
    handleDriverChange,
    handleSuburbChange,
    handleProductsChange,
    handleSubtotalChange,
    handleFormDataChange,
    getFormDataForSubmission
  } = useOrderEditFormLogic(order);

  // Prepare business information from order data
  const businessInfo = {
    company_name: order.company_name,
    business_name: order.business_name,
    customer_type: order.customer_type
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      // Get form data with proper time format for database submission
      const submissionData = getFormDataForSubmission();
      
      await handleOrderSubmission(order, submissionData, onOrderUpdated, onClose);
    } catch (error) {
      // Error handling is done in the submission function
    } finally {
      setIsUpdating(false);
    }
  };

  // Convert conflict results to the format expected by OrderEditFooter
  const driverConflictInfo = convertToConflictInfo(driverConflict);
  const truckConflictInfo = convertToConflictInfo(truckConflict);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <OrderEditSections
        formData={formData}
        deliveryRate={deliveryRate}
        orderId={order.id}
        businessInfo={businessInfo}
        onInputChange={handleInputChange}
        onDriverChange={handleDriverChange}
        onSuburbChange={handleSuburbChange}
        onProductsChange={handleProductsChange}
        onSubtotalChange={handleSubtotalChange}
        onFormDataChange={handleFormDataChange}
      />

      <OrderEditConflictSection
        deliveryDate={formData.delivery_date}
        deliveryTime={formData.delivery_time}
        driverConflict={driverConflict}
        truckConflict={truckConflict}
        isChecking={isChecking}
      />

      <OrderEditFooter
        isUpdating={isUpdating}
        onClose={onClose}
        driverConflict={driverConflictInfo}
        truckConflict={truckConflictInfo}
        hasAnyConflict={hasAnyConflict}
      />
    </form>
  );
}
