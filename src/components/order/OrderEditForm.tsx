
import { useState } from "react";
import { OrderEditFooter } from "./OrderEditFooter";
import { OrderEditSections } from "./OrderEditSections";
import { OrderEditConflictSection } from "./OrderEditConflictSection";
import { OrderEditFormProps } from "./OrderEditFormTypes";
import { OrderReturnDialog } from "./returns/OrderReturnDialog";
import { useOrderEditFormLogic, convertToConflictInfo } from "./OrderEditFormLogic";
import { useOrderFormSubmission } from "./OrderEditFormSubmission";

export function OrderEditForm({ order, onOrderUpdated, onClose }: OrderEditFormProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
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
    handleContactChange,
    handleFormDataChange,
    getFormDataForSubmission,
    calculationBreakdown,
    paymentSettings
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
        customerId={order.customer_id}
        businessInfo={businessInfo}
        onInputChange={handleInputChange}
        onDriverChange={handleDriverChange}
        onSuburbChange={handleSuburbChange}
        onProductsChange={handleProductsChange}
        onSubtotalChange={handleSubtotalChange}
        onContactChange={handleContactChange}
        onFormDataChange={handleFormDataChange}
        calculationBreakdown={calculationBreakdown}
        paymentSettings={paymentSettings}
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
        order={order}
        onReturnClick={() => setShowReturnDialog(true)}
      />

      {/* Return Dialog */}
      <OrderReturnDialog
        open={showReturnDialog}
        onOpenChange={setShowReturnDialog}
        order={order}
        onReturnCreated={onOrderUpdated}
      />
    </form>
  );
}
