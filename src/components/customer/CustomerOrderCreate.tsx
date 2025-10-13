import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProductSelectionStep } from "@/components/order/ProductSelectionStep";
import { DeliveryDetailsStep } from "@/components/order/DeliveryDetailsStep";
import { useQuery } from "@tanstack/react-query";

interface CustomerOrderCreateProps {
  customer: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function CustomerOrderCreate({ customer, onClose, onSuccess }: CustomerOrderCreateProps) {
  const [step, setStep] = useState<'products' | 'details' | 'review'>('products');
  const [cart, setCart] = useState<any[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState(customer.full_address || '');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
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
        delivery_address: deliveryAddress,
        delivery_date: deliveryDate || null,
        delivery_time: deliveryTime || null,
        products,
        subtotal: calculateTotal(),
        total_amount: calculateTotal(),
        delivery_fee: 0,
        adjustments: 0,
        status: 'requested',
        payment_status: 'pending',
        payment_method: 'invoice',
        delivery_method: 'delivery',
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
                onNext={() => setStep('details')}
                onBack={onClose}
              />
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={() => setStep('details')} disabled={cart.length === 0}>
                  Continue to Delivery Details
                </Button>
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-4">
              <div>
                <Label>Delivery Address</Label>
                <Textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Enter delivery address"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Delivery Date (Optional)</Label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-md"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Delivery Time (Optional)</Label>
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
                <Button variant="outline" onClick={() => setStep('products')}>Back</Button>
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
                  <p className="text-sm font-medium text-muted-foreground">Delivery Address</p>
                  <p className="text-sm">{deliveryAddress}</p>
                </div>

                {deliveryDate && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Requested Delivery</p>
                    <p className="text-sm">{new Date(deliveryDate).toLocaleDateString()} {deliveryTime && `at ${deliveryTime}`}</p>
                  </div>
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
