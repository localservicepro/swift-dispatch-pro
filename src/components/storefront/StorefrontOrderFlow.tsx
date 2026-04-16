import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StorefrontCartItem } from "./StorefrontProductBrowser";
import { EnhancedAddressInput } from "@/components/ui/enhanced-address-input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Truck,
  Store,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  ShoppingBag,
  User,
  MapPin,
  CalendarDays,
  MessageSquare,
  ChevronDown,
  Shield,
} from "lucide-react";

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
  cart: StorefrontCartItem[];
  onBack: () => void;
}

interface AddressData {
  fullAddress: string;
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  lat?: number;
  lng?: number;
}

export function StorefrontOrderFlow({ customer, accountNumber, cart, onBack }: StorefrontOrderFlowProps) {
  const { toast } = useToast();
  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">("delivery");
  const [deliveryAddress, setDeliveryAddress] = useState(customer.full_address || "");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{ orderNumber: string } | null>(null);

  // Contact fields
  const [contactName, setContactName] = useState(customer.display_name || "");
  const [contactPhone, setContactPhone] = useState(customer.phone || "");
  const [contactEmail, setContactEmail] = useState(customer.email || "");

  // Suburb / delivery fee
  const [matchedSuburbId, setMatchedSuburbId] = useState<string | null>(customer.suburb_id || null);
  const [matchedSuburbName, setMatchedSuburbName] = useState<string | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [fuelSurcharge, setFuelSurcharge] = useState(0);

  // Fetch fuel surcharge from payment settings
  useEffect(() => {
    const fetchFuelSurcharge = async () => {
      try {
        const { data } = await supabase
          .from("payment_settings")
          .select("fuel_surcharge")
          .single();
        if (data?.fuel_surcharge != null) {
          setFuelSurcharge(Number(data.fuel_surcharge) || 0);
        }
      } catch {
        setFuelSurcharge(5); // fallback default
      }
    };
    fetchFuelSurcharge();
  }, []);

  // Collapsible sections
  const [openSections, setOpenSections] = useState({
    contact: true,
    delivery: true,
    address: true,
    schedule: false,
    notes: false,
  });

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const activeFuelSurcharge = deliveryMethod === "delivery" ? fuelSurcharge : 0;
  const cartTotal = cartSubtotal + deliveryFee + activeFuelSurcharge;

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Parse delivery rate from text like "AU$50", "$50", "50" etc.
  const parseDeliveryRate = (rate: any): number => {
    if (rate == null) return 0;
    if (typeof rate === "number") return rate;
    const cleaned = String(rate).replace(/[^0-9.]/g, "");
    return parseFloat(cleaned) || 0;
  };

  // Auto-match suburb by postcode
  const handleAddressSelect = useCallback(async (addressData: AddressData) => {
    setDeliveryAddress(addressData.fullAddress);
    if (addressData.postcode) {
      try {
        const { data: suburbs } = await supabase
          .from("suburbs")
          .select("id, name, delivery_rate")
          .eq("postcode", addressData.postcode)
          .eq("is_active", true)
          .limit(1);

        if (suburbs && suburbs.length > 0) {
          const baseRate = parseDeliveryRate(suburbs[0].delivery_rate);
          setMatchedSuburbId(suburbs[0].id);
          setMatchedSuburbName(suburbs[0].name);
          setDeliveryFee(baseRate);
        } else {
          setMatchedSuburbId(null);
          setMatchedSuburbName(null);
          setDeliveryFee(0);
        }
      } catch {
        setMatchedSuburbId(null);
        setMatchedSuburbName(null);
        setDeliveryFee(0);
      }
    }
  }, []);

  const handleSubmitOrder = async () => {
    if (!contactName.trim()) {
      toast({ title: "Contact name required", variant: "destructive" });
      return;
    }
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
          suburb_id: matchedSuburbId || customer.suburb_id || undefined,
          contact_name: contactName || undefined,
          contact_phone: contactPhone || undefined,
          contact_email: contactEmail || undefined,
          delivery_fee: deliveryMethod === "delivery" ? deliveryFee + activeFuelSurcharge : 0,
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

  // Order confirmation
  if (orderResult) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md text-center shadow-xl border-0">
          <CardContent className="pt-10 pb-10 space-y-5">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Order Confirmed!</h2>
            <p className="text-muted-foreground">
              Your order{" "}
              <span className="font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded">
                {orderResult.orderNumber}
              </span>{" "}
              has been submitted successfully.
            </p>
            <p className="text-sm text-muted-foreground">We'll process your order shortly.</p>
            <Button onClick={onBack} variant="outline" className="mt-4 rounded-xl">
              Place Another Order
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const SectionHeader = ({
    icon: Icon,
    title,
    section,
    badge,
  }: {
    icon: any;
    title: string;
    section: keyof typeof openSections;
    badge?: string;
  }) => (
    <CollapsibleTrigger
      className="flex items-center justify-between w-full py-3 group"
      onClick={() => toggleSection(section)}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <span className="font-semibold text-sm">{title}</span>
        {badge && (
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{badge}</span>
        )}
      </div>
      <ChevronDown
        className={`h-4 w-4 text-muted-foreground transition-transform ${
          openSections[section] ? "rotate-180" : ""
        }`}
      />
    </CollapsibleTrigger>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Form Sections */}
      <div className="lg:col-span-2 space-y-4">
        {/* Customer Badge */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-background border">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{customer.display_name}</p>
            <p className="text-xs text-muted-foreground">Account: {accountNumber}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onBack} className="text-xs">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Start Over
          </Button>
        </div>

        {/* Contact Details */}
        <Card className="shadow-sm">
          <Collapsible open={openSections.contact}>
            <CardHeader className="pb-0 pt-2 px-5">
              <SectionHeader icon={User} title="Contact Details" section="contact" />
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="px-5 pb-5 pt-2 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Contact Name *</Label>
                    <Input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Full name"
                      className="h-10 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Phone</Label>
                    <Input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="Phone number"
                      className="h-10 rounded-lg"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Email</Label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Email address"
                    className="h-10 rounded-lg"
                  />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Delivery Method */}
        <Card className="shadow-sm">
          <Collapsible open={openSections.delivery}>
            <CardHeader className="pb-0 pt-2 px-5">
              <SectionHeader
                icon={Truck}
                title="Delivery Method"
                section="delivery"
                badge={deliveryMethod === "delivery" ? "Delivery" : "Pickup"}
              />
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="px-5 pb-5 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDeliveryMethod("delivery")}
                    className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all ${
                      deliveryMethod === "delivery"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <Truck className={`h-7 w-7 ${deliveryMethod === "delivery" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`font-medium text-sm ${deliveryMethod === "delivery" ? "text-primary" : ""}`}>
                      Delivery
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setDeliveryMethod("pickup");
                      setDeliveryFee(0);
                    }}
                    className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all ${
                      deliveryMethod === "pickup"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <Store className={`h-7 w-7 ${deliveryMethod === "pickup" ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`font-medium text-sm ${deliveryMethod === "pickup" ? "text-primary" : ""}`}>
                      Pickup
                    </span>
                  </button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Delivery Address - only for delivery */}
        {deliveryMethod === "delivery" && (
          <Card className="shadow-sm">
            <Collapsible open={openSections.address}>
              <CardHeader className="pb-0 pt-2 px-5">
                <SectionHeader
                  icon={MapPin}
                  title="Delivery Address"
                  section="address"
                  badge={matchedSuburbName || undefined}
                />
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="px-5 pb-5 pt-2 space-y-3">
                  <EnhancedAddressInput
                    value={deliveryAddress}
                    onChange={setDeliveryAddress}
                    onAddressSelect={handleAddressSelect}
                    placeholder="Start typing your delivery address..."
                    showMapButton={true}
                    showValidation={false}
                  />
                  {matchedSuburbName && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>
                        Suburb: <strong className="text-foreground">{matchedSuburbName}</strong>
                        {deliveryFee > 0 && (
                          <> · Delivery fee: <strong className="text-foreground">${deliveryFee.toFixed(2)}</strong></>
                        )}
                      </span>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}

        {/* Schedule */}
        <Card className="shadow-sm">
          <Collapsible open={openSections.schedule}>
            <CardHeader className="pb-0 pt-2 px-5">
              <SectionHeader icon={CalendarDays} title="Preferred Schedule" section="schedule" badge="Optional" />
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="px-5 pb-5 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Date</Label>
                    <Input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="h-10 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Time</Label>
                    <Input
                      type="time"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      className="h-10 rounded-lg"
                    />
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Notes */}
        <Card className="shadow-sm">
          <Collapsible open={openSections.notes}>
            <CardHeader className="pb-0 pt-2 px-5">
              <SectionHeader icon={MessageSquare} title="Order Notes" section="notes" badge="Optional" />
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="px-5 pb-5 pt-2">
                <Textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Any special instructions for your order..."
                  rows={3}
                  className="rounded-lg resize-none"
                />
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>

      {/* Right: Order Summary */}
      <div className="lg:col-span-1">
        <div className="sticky top-20">
          <Card className="shadow-lg border-0 bg-background">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingBag className="h-4 w-4" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">
                      {item.name} <span className="text-xs">×{item.quantity}</span>
                    </span>
                    <span className="font-medium shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${cartSubtotal.toFixed(2)}</span>
                </div>
                {deliveryMethod === "delivery" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery</span>
                      <span>{deliveryFee > 0 ? `$${deliveryFee.toFixed(2)}` : "Free"}</span>
                    </div>
                    {fuelSurcharge > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fuel Surcharge</span>
                        <span>${fuelSurcharge.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <Separator />

              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>

              <Button
                className="w-full h-12 rounded-xl text-base font-semibold mt-2"
                onClick={handleSubmitOrder}
                disabled={isSubmitting || !contactName.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  "Place Order"
                )}
              </Button>

              <p className="text-[11px] text-center text-muted-foreground">
                Payment on account · Charged to {accountNumber}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
