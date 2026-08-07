
import React, { useState } from 'react';
import { Calendar, Settings, User2, FileText, MessageSquare, AlertCircle, PackageX } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DriverSelector } from "./DriverSelector";
import { OrderBasicInfoForm } from "./OrderBasicInfoForm";
import { OrderPricingForm } from "./OrderPricingForm";
import { OrderTruckSelectionForm } from "./OrderTruckSelectionForm";
import { OrderDeliveryForm } from "./OrderDeliveryForm";
import { DeliveryScheduler } from "./DeliveryScheduler";
import { PickupScheduler } from "./PickupScheduler";
import { ProductEditSection } from "./ProductEditSection";
import { ContactSelectionSection } from "./ContactSelectionSection";
import { OrderReturnsSection } from "./returns/OrderReturnsSection";
import { MoveToBackorderDialog } from "./MoveToBackorderDialog";
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
  missingFuelSurchargeAmount?: number;
  applyMissingFuelSurcharge?: () => void;
  /** Master orders in a split group derive their items from the splits. */
  productsReadOnly?: boolean;
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
  paymentSettings,
  missingFuelSurchargeAmount,
  applyMissingFuelSurcharge,
  productsReadOnly = false,
}: OrderEditSectionsProps) {
  const [backorderDialogOpen, setBackorderDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      {productsReadOnly ? (
        <div className="bg-muted/40 border rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-foreground">Items (from splits)</h3>
          <p className="text-xs text-muted-foreground">
            This is the master order — edit items on each split tab. Totals here are rebuilt from the splits when you save.
          </p>
          <ul className="text-sm space-y-1 mt-2">
            {(formData.products || []).map((item: any, i: number) => (
              <li key={item.id || item.product_id || i} className="flex justify-between gap-4">
                <span className="truncate">{item.name || item.product_name || 'Item'}</span>
                <span className="text-muted-foreground shrink-0">
                  {item.quantity} × ${Number(item.price || item.unit_price || 0).toFixed(2)}
                </span>
              </li>
            ))}
            {(formData.products || []).length === 0 && (
              <li className="text-muted-foreground">No items on the master record.</li>
            )}
          </ul>
        </div>
      ) : (
        <ProductEditSection
          currentProducts={formData.products}
          onProductsChange={onProductsChange}
          onSubtotalChange={onSubtotalChange}
        />
      )}


      {/* Returns Section */}
      <OrderReturnsSection 
        orderId={orderId}
        onProcessReturn={() => {
          window.location.reload();
        }}
      />

      {/* Move to Backorder Section */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageX className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-orange-900">Backorder</h3>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBackorderDialogOpen(true)}
            className="border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            Move Items to Backorder
          </Button>
        </div>
        <p className="text-xs text-orange-600 mt-2">
          Split selected items into a separate backorder for items that are out of stock or not needed yet.
        </p>
      </div>

      <MoveToBackorderDialog
        open={backorderDialogOpen}
        onOpenChange={setBackorderDialogOpen}
        orderId={orderId}
        products={formData.products}
        onBackorderCreated={() => {
          window.location.reload();
        }}
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

      {/* Only show delivery address form for delivery orders */}
      {formData.delivery_method === 'delivery' && (
        <OrderDeliveryForm
          formData={{
            full_address: formData.customer_address,
            suburb_id: formData.suburb_id || '',
            delivery_suburb_id: formData.delivery_suburb_id || '',
          }}
          deliveryRate={deliveryRate}
          onFormDataChange={onFormDataChange}
          onSuburbChange={onSuburbChange}
        />
      )}

      {/* Conditional rendering for delivery vs pickup scheduling */}
      {formData.delivery_method === 'delivery' ? (
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
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-900">Pickup Schedule</h3>
          </div>
          
          <PickupScheduler
            pickupDate={formData.delivery_date}
            pickupTime={formData.delivery_time}
            onPickupDateChange={(date) => onInputChange('delivery_date', date)}
            onPickupTimeChange={(time) => onInputChange('delivery_time', time)}
          />
        </div>
      )}

      <OrderPricingForm 
        formData={formData}
        onInputChange={onInputChange}
        calculationBreakdown={calculationBreakdown}
        paymentSettings={paymentSettings}
        orderId={orderId}
        customerId={customerId}
        deliveryMethod={formData.delivery_method}
        missingFuelSurchargeAmount={missingFuelSurchargeAmount}
        applyMissingFuelSurcharge={applyMissingFuelSurcharge}
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
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Only show truck and driver assignment for delivery orders */}
      {formData.delivery_method === 'delivery' && (
        <>
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
        </>
      )}

      {/* Notes Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">Notes</h3>
        </div>
        
        {/* Order Notes - Always visible for admins */}
        <div>
          <Label htmlFor="order_notes" className="text-sm font-medium flex items-center gap-2">
            <FileText className="w-3 h-3 text-blue-600" />
            Internal notes for admins only
          </Label>
          <Textarea
            id="order_notes"
            placeholder="Internal notes for admins (not visible to customers or on invoices)"
            value={formData.order_notes || ''}
            onChange={(e) => onInputChange('order_notes', e.target.value)}
            className="border-slate-200 focus:border-slate-400 focus:ring-slate-200 min-h-[80px]"
          />
          <p className="text-xs text-slate-500 mt-1">These notes are only visible to administrators</p>
        </div>

        {/* Delivery Notes - Only for delivery orders */}
        {formData.delivery_method === 'delivery' && (
          <div>
            <Label htmlFor="delivery_notes" className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="w-3 h-3 text-green-600" />
              Delivery notes for drivers
            </Label>
            <Textarea
              id="delivery_notes"
              placeholder="Notes for the delivery driver (instructions, special requirements, etc.)"
              value={formData.delivery_notes || ''}
              onChange={(e) => onInputChange('delivery_notes', e.target.value)}
              className="border-slate-200 focus:border-slate-400 focus:ring-slate-200 min-h-[80px]"
            />
            <p className="text-xs text-slate-500 mt-1">These notes are visible to drivers assigned to this delivery</p>
          </div>
        )}

      </div>
    </div>
  );
}
