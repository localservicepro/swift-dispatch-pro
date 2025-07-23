
import React from 'react';
import { Calendar, Settings, User2, FileText } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DriverSelector } from "./DriverSelector";
import { OrderBasicInfoForm } from "./OrderBasicInfoForm";
import { OrderPricingForm } from "./OrderPricingForm";
import { OrderTruckSelectionForm } from "./OrderTruckSelectionForm";
import { OrderDeliveryForm } from "./OrderDeliveryForm";
import { DeliveryScheduler } from "./DeliveryScheduler";
import { ProductEditSection } from "./ProductEditSection";
import { ContactSelectionSection } from "./ContactSelectionSection";
import { PickupDetailsEditSection } from "./PickupDetailsEditSection";
import { OrderFormData } from "./hooks/useOrderFormData";

interface OrderEditSectionsProps {
  formData: OrderFormData;
  deliveryRate: string;
  orderId: string;
  customerId?: string;
  businessInfo?: {
    company_name?: string;
    business_name?: string;
    customer_type?: string;
  };
  onInputChange: (field: string, value: string) => void;
  onDriverChange: (driverId: string) => void;
  onSuburbChange: (suburbId: string) => void;
  onProductsChange: (products: any[]) => void;
  onSubtotalChange: (subtotal: number) => void;
  onContactChange: (contactData: {
    contact_id: string | null;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
  }) => void;
  onFormDataChange: (updates: any) => void;
  calculationBreakdown?: any;
  paymentSettings?: any;
}

export function OrderEditSections({
  formData,
  deliveryRate,
  orderId,
  customerId,
  businessInfo,
  onInputChange,
  onDriverChange,
  onSuburbChange,
  onProductsChange,
  onSubtotalChange,
  onContactChange,
  onFormDataChange,
  calculationBreakdown,
  paymentSettings
}: OrderEditSectionsProps) {
  return (
    <div className="space-y-6">
      <ProductEditSection
        currentProducts={formData.products}
        onProductsChange={onProductsChange}
        onSubtotalChange={onSubtotalChange}
      />

      {/* Purchase Order Section */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-orange-600" />
          <h3 className="font-semibold text-orange-900">Purchase Order Reference</h3>
        </div>
        
        <div>
          <Label htmlFor="purchase_order" className="text-gray-700 font-medium">Purchase Order Number</Label>
          <Input
            id="purchase_order"
            type="text"
            placeholder="Enter customer PO number (optional)"
            value={formData.purchase_order || ''}
            onChange={(e) => onInputChange('purchase_order', e.target.value)}
            className="border-orange-200 focus:border-orange-400 focus:ring-orange-200"
          />
          <p className="text-xs text-orange-600 mt-1">Customer's purchase order number for reference</p>
        </div>
      </div>

      {/* Contact Selection for Business Customers */}
      {customerId && businessInfo?.customer_type && 
       (businessInfo.customer_type === 'account' || businessInfo.customer_type === 'business') && (
        <ContactSelectionSection
          customerId={customerId}
          currentContactId={formData.contact_id}
          currentContactName={formData.contact_name}
          currentContactEmail={formData.contact_email}
          currentContactPhone={formData.contact_phone}
          onContactChange={onContactChange}
        />
      )}

      <OrderBasicInfoForm 
        formData={formData}
        businessInfo={businessInfo}
        onInputChange={onInputChange}
      />

      {/* Pickup Details Section - Only show for pickup_delivery orders */}
      {formData.delivery_method === 'pickup_delivery' && (
        <PickupDetailsEditSection
          formData={formData}
          onInputChange={onInputChange}
        />
      )}

      <OrderDeliveryForm
        formData={{
          full_address: formData.customer_address,
          suburb_id: formData.suburb_id || '',
        }}
        deliveryRate={deliveryRate}
        onFormDataChange={onFormDataChange}
        onSuburbChange={onSuburbChange}
      />

      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-teal-900">Delivery Schedule</h3>
        </div>
        
        <DeliveryScheduler
          deliveryDate={formData.delivery_date}
          deliveryTime={formData.delivery_time}
          onDeliveryDateChange={(date) => onInputChange('delivery_date', date)}
          onDeliveryTimeChange={(time) => onInputChange('delivery_time', time)}
        />
      </div>

      <OrderPricingForm 
        formData={formData}
        onInputChange={onInputChange}
        calculationBreakdown={calculationBreakdown}
        paymentSettings={paymentSettings}
      />

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">Order Status</h3>
        </div>
        
        <div>
          <Label htmlFor="status" className="text-gray-700 font-medium">Status</Label>
          <Select value={formData.status} onValueChange={(value) => onInputChange('status', value)}>
            <SelectTrigger className="border-slate-200 focus:border-slate-400 focus:ring-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="loading">Loading</SelectItem>
              <SelectItem value="en_route">En Route</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="pickup_scheduled">Pickup Scheduled</SelectItem>
              <SelectItem value="pickup_in_progress">Pickup In Progress</SelectItem>
              <SelectItem value="pickup_complete">Pickup Complete</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <OrderTruckSelectionForm 
        formData={formData}
        onInputChange={onInputChange}
        orderId={orderId}
      />

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <User2 className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-indigo-900">Driver Assignment</h3>
        </div>
        
        <DriverSelector
          selectedDriverId={formData.driver_id}
          onDriverChange={onDriverChange}
        />
      </div>
    </div>
  );
}
