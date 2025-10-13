import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProductSelectionStep } from "@/components/order/ProductSelectionStep";
import { DeliveryMethodSelectionStep } from "@/components/order/DeliveryMethodSelectionStep";
import { ContactSelector } from "@/components/customer/ContactSelector";
import { GoogleAddressAutocomplete } from "@/components/ui/google-address-autocomplete";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CustomerOrderCreateProps {
  customer: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function CustomerOrderCreate({ customer, onClose, onSuccess }: CustomerOrderCreateProps) {
  const [step, setStep] = useState<'products' | 'method' | 'contact' | 'details' | 'review'>('products');
  const [cart, setCart] = useState<any[]>([]);
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [deliveryAddress, setDeliveryAddress] = useState(customer.full_address || '');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [pickupLocation, setPickupLocation] = useState({
    address: '',
    name: '',
    contactName: '',
    contactPhone: '',
    instructions: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch payment settings for calculations
  const { data: paymentSettings } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('payment_settings')
        .select('*')
        .single();
      return data;
    }
  });

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    return subtotal;
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    if (deliveryMethod === 'delivery' && !deliveryAddress) {
      toast.error('Please enter a delivery address');
      return;
    }

    if (deliveryMethod === 'pickup' && !pickupLocation.address) {
      toast.error('Please enter a pickup location address');
      return;
    }

    setIsSubmitting(true);
    try {
      const products = cart.map(item => ({
        id: item.product.id,
        name: item.product.name,
        price: item.unit_price,
        quantity: item.quantity,
        total_price: item.unit_price * item.quantity
      }));

      const { error } = await supabase.from('orders').insert([{
        customer_id: customer.id,
        customer_name: customer.company_name || customer.business_name || `${customer.first_name} ${customer.last_name}`,
        customer_phone: customer.phone || '',
        customer_address: customer.full_address,
        
        // Delivery method
        delivery_method: deliveryMethod,
        
        // Contact information
        contact_id: selectedContact?.id || null,
        contact_name: selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name}` : null,
        contact_email: selectedContact?.email || null,
        contact_phone: selectedContact?.phone || null,
        
        // Delivery fields
        delivery_address: deliveryMethod === 'delivery' ? deliveryAddress : customer.full_address,
        delivery_date: deliveryMethod === 'delivery' ? (deliveryDate || null) : null,
        delivery_time: deliveryMethod === 'delivery' ? (deliveryTime || null) : null,
        
        // Pickup fields
        pickup_location_address: deliveryMethod === 'pickup' ? pickupLocation.address : null,
        pickup_location_name: deliveryMethod === 'pickup' ? (pickupLocation.name || null) : null,
        pickup_contact_name: deliveryMethod === 'pickup' ? (pickupLocation.contactName || null) : null,
        pickup_contact_phone: deliveryMethod === 'pickup' ? (pickupLocation.contactPhone || null) : null,
        pickup_instructions: deliveryMethod === 'pickup' ? (pickupLocation.instructions || null) : null,
        pickup_date: deliveryMethod === 'pickup' ? (deliveryDate || null) : null,
        pickup_time: deliveryMethod === 'pickup' ? (deliveryTime || null) : null,
        
        products,
        subtotal: calculateTotal(),
        total_amount: calculateTotal(),
        delivery_fee: 0,
        adjustments: 0,
        status: 'requested',
        payment_status: 'pending',
        payment_method: 'invoice',
        order_notes: orderNotes || null,
        order_number: '' // Will be set by trigger
      } as any]);

      if (error) throw error;

      toast.success('Order created successfully! Our team will review and process it soon.');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {step === 'products' && (
            <div>
              <ProductSelectionStep
                cart={cart}
                subtotal={calculateTotal()}
                adjustments={0}
                onCartUpdate={setCart}
                onAdjustmentsChange={() => {}}
                onNext={() => setStep('method')}
                onBack={onClose}
              />
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={() => setStep('method')} disabled={cart.length === 0}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 'method' && (
            <DeliveryMethodSelectionStep
              deliveryMethod={deliveryMethod}
              onDeliveryMethodChange={setDeliveryMethod}
              onBack={() => setStep('products')}
              onNext={() => customer.customer_type === 'account' ? setStep('contact') : setStep('details')}
            />
          )}

          {step === 'contact' && customer.customer_type === 'account' && (
            <div className="space-y-4">
              <ContactSelector
                customerId={customer.id}
                selectedContact={selectedContact}
                onContactSelect={setSelectedContact}
              />
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep('method')}>Back</Button>
                <Button onClick={() => setStep('details')}>Continue</Button>
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-4">
              {deliveryMethod === 'delivery' ? (
                <div>
                  <Label>Delivery Address *</Label>
                  <GoogleAddressAutocomplete
                    value={deliveryAddress}
                    onChange={setDeliveryAddress}
                    onAddressSelect={(addressData) => {
                      setDeliveryAddress(addressData.fullAddress);
                    }}
                    placeholder="Search for delivery address"
                    required
                  />
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Pickup Location Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Pickup Location Address *</Label>
                      <GoogleAddressAutocomplete
                        value={pickupLocation.address}
                        onChange={(addr) => setPickupLocation({...pickupLocation, address: addr})}
                        onAddressSelect={(addressData) => {
                          setPickupLocation({...pickupLocation, address: addressData.fullAddress});
                        }}
                        placeholder="Enter pickup address"
                        required
                      />
                    </div>
                    <div>
                      <Label>Location Name (Optional)</Label>
                      <Input
                        value={pickupLocation.name}
                        onChange={(e) => setPickupLocation({...pickupLocation, name: e.target.value})}
                        placeholder="e.g., Main Warehouse, Building A"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Contact Name (Optional)</Label>
                        <Input
                          value={pickupLocation.contactName}
                          onChange={(e) => setPickupLocation({...pickupLocation, contactName: e.target.value})}
                          placeholder="Contact person"
                        />
                      </div>
                      <div>
                        <Label>Contact Phone (Optional)</Label>
                        <Input
                          value={pickupLocation.contactPhone}
                          onChange={(e) => setPickupLocation({...pickupLocation, contactPhone: e.target.value})}
                          placeholder="Contact phone"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Pickup Instructions (Optional)</Label>
                      <Textarea
                        value={pickupLocation.instructions}
                        onChange={(e) => setPickupLocation({...pickupLocation, instructions: e.target.value})}
                        placeholder="Special instructions for pickup"
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{deliveryMethod === 'delivery' ? 'Delivery' : 'Pickup'} Date (Optional)</Label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-md"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{deliveryMethod === 'delivery' ? 'Delivery' : 'Pickup'} Time (Optional)</Label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border rounded-md"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Order Notes (Optional)</Label>
                <Textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Any special instructions or notes"
                  rows={3}
                />
              </div>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => customer.customer_type === 'account' ? setStep('contact') : setStep('method')}>Back</Button>
                <Button onClick={() => setStep('review')}>Review Order</Button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold">Order Summary</h3>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Products</p>
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.product.name} x {item.quantity}</span>
                      <span>${(item.unit_price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Method</p>
                  <p className="text-sm">{deliveryMethod === 'delivery' ? 'Delivery' : 'Yard Pickup'}</p>
                </div>

                {selectedContact && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contact</p>
                    <p className="text-sm">{selectedContact.first_name} {selectedContact.last_name}</p>
                    {selectedContact.email && <p className="text-xs text-muted-foreground">{selectedContact.email}</p>}
                    {selectedContact.phone && <p className="text-xs text-muted-foreground">{selectedContact.phone}</p>}
                  </div>
                )}

                {deliveryMethod === 'delivery' ? (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Delivery Address</p>
                      <p className="text-sm">{deliveryAddress}</p>
                    </div>
                    {deliveryDate && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Requested Delivery</p>
                        <p className="text-sm">{new Date(deliveryDate).toLocaleDateString()} {deliveryTime && `at ${deliveryTime}`}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pickup Location</p>
                      <p className="text-sm">{pickupLocation.address}</p>
                      {pickupLocation.name && <p className="text-xs text-muted-foreground">{pickupLocation.name}</p>}
                    </div>
                    {(pickupLocation.contactName || pickupLocation.contactPhone) && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Pickup Contact</p>
                        {pickupLocation.contactName && <p className="text-sm">{pickupLocation.contactName}</p>}
                        {pickupLocation.contactPhone && <p className="text-xs text-muted-foreground">{pickupLocation.contactPhone}</p>}
                      </div>
                    )}
                    {pickupLocation.instructions && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Pickup Instructions</p>
                        <p className="text-sm">{pickupLocation.instructions}</p>
                      </div>
                    )}
                    {deliveryDate && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Requested Pickup</p>
                        <p className="text-sm">{new Date(deliveryDate).toLocaleDateString()} {deliveryTime && `at ${deliveryTime}`}</p>
                      </div>
                    )}
                  </>
                )}

                {orderNotes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p className="text-sm">{orderNotes}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep('details')}>Back</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Creating Order...' : 'Submit Order'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
