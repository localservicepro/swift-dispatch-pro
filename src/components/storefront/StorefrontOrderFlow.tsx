import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StorefrontProductBrowser, StorefrontCartItem } from "./StorefrontProductBrowser";
import { Truck, Store, Loader2, CheckCircle2, ArrowLeft, ShoppingBag } from "lucide-react";

interface CustomerInfo {
  id: string;
  display_name: string;
  full_address: string | null;
  customer_type: string;
  email: string | null;
  phone: string | null;
  suburb_id: string | null;
}

interface StorefrontOrderFlowProps {
  customer: CustomerInfo;
  accountNumber: string;
  onBack: () => void;
}

export function StorefrontOrderFlow({ customer, accountNumber, onBack }: StorefrontOrderFlowProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [cart, setCart] = useState<StorefrontCartItem[]>([]);
  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">("delivery");
  const [deliveryAddress, setDeliveryAddress] = useState(customer.full_address || "");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{ orderNumber: string } | null>(null);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalSteps = 4;

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("storefront-create-order", {
        body: {
          account_number: accountNumber,
          products: cart,
          delivery_method: deliveryMethod,
          delivery_address: deliveryMethod === "delivery" ? deliveryAddress : undefined,
          delivery_date: deliveryDate || undefined,
          delivery_time: deliveryTime || undefined,
          order_notes: orderNotes || undefined,
          payment_method: "account",
          suburb_id: customer.suburb_id || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setOrderResult({ orderNumber: data.orderNumber });
      toast({ title: "Order placed!", description: `Order ${data.orderNumber} has been submitted.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to place order", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Order confirmation screen
  if (orderResult) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Order Confirmed!</h2>
            <p className="text-muted-foreground">
              Your order <span className="font-mono font-semibold text-foreground">{orderResult.orderNumber}</span> has been submitted successfully.
            </p>
            <p className="text-sm text-muted-foreground">We'll process your order shortly.</p>
            <Button onClick={onBack} variant="outline" className="mt-4">
              Place Another Order
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Customer header */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <ShoppingBag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{customer.display_name}</p>
              <p className="text-xs text-muted-foreground">Account: {accountNumber}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Change Account
          </Button>
        </CardContent>
      </Card>

      {/* Progress */}
      <div className="flex gap-1">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      {/* Step 1: Products */}
      {step === 1 && (
        <StorefrontProductBrowser cart={cart} onCartChange={setCart} onNext={() => setStep(2)} onBack={onBack} />
      )}

      {/* Step 2: Delivery Method */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery Method</CardTitle>
            <CardDescription>How would you like to receive your order?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={deliveryMethod} onValueChange={(v) => setDeliveryMethod(v as "delivery" | "pickup")} className="grid grid-cols-2 gap-4">
              <Label htmlFor="delivery" className={`flex flex-col items-center gap-3 rounded-lg border-2 p-6 cursor-pointer transition-colors ${deliveryMethod === "delivery" ? "border-primary bg-primary/5" : "border-muted"}`}>
                <RadioGroupItem value="delivery" id="delivery" className="sr-only" />
                <Truck className="h-8 w-8 text-primary" />
                <span className="font-medium">Delivery</span>
              </Label>
              <Label htmlFor="pickup" className={`flex flex-col items-center gap-3 rounded-lg border-2 p-6 cursor-pointer transition-colors ${deliveryMethod === "pickup" ? "border-primary bg-primary/5" : "border-muted"}`}>
                <RadioGroupItem value="pickup" id="pickup" className="sr-only" />
                <Store className="h-8 w-8 text-primary" />
                <span className="font-medium">Pickup</span>
              </Label>
            </RadioGroup>

            {deliveryMethod === "delivery" && (
              <div className="space-y-2">
                <Label>Delivery Address</Label>
                <Textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Enter delivery address" rows={2} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Preferred Date</Label>
                <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
              </div>
              <div className="space-y-2">
                <Label>Preferred Time</Label>
                <Input type="time" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>Next</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Notes */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Order Notes</CardTitle>
            <CardDescription>Any special instructions for your order?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="e.g. Please call before delivery..." rows={4} />
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => setStep(4)}>Review Order</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Review Your Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Products</h4>
              <div className="divide-y rounded-md border">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between p-3 text-sm">
                    <span>{item.name} × {item.quantity}</span>
                    <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="capitalize">{deliveryMethod}</span>
              </div>
              {deliveryMethod === "delivery" && deliveryAddress && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Address</span>
                  <span className="text-right max-w-[60%]">{deliveryAddress}</span>
                </div>
              )}
              {deliveryDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span>{deliveryDate}</span>
                </div>
              )}
              {deliveryTime && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span>{deliveryTime}</span>
                </div>
              )}
              {orderNotes && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Notes</span>
                  <span className="text-right max-w-[60%]">{orderNotes}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-3 flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <Button onClick={handleSubmitOrder} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  "Place Order"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
