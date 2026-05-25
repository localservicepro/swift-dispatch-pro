import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Package,
  User,
  MapPin,
  Clock,
  CreditCard,
  Store,
  Home,
  FileText,
  Truck,
  Receipt,
  Building,
} from "lucide-react";
import { Customer, CartItem, SelectedContact, SplitConfig } from "./types";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";
import { calculateOrderTotals } from "./utils/paymentCalculations";
import {
  EditAddressPopover,
  EditScheduleopover,
  EditSchedulePopover,
  EditInstructionsPopover,
  SplitAddressBadge,
} from "./review/SplitEditPopovers";

interface OrderReviewStepProps {
  customer: Customer;
  selectedContact?: SelectedContact | null;
  cart: CartItem[];
  splits?: SplitConfig[];
  orderType?: "single" | "split";
  subtotal: number;
  adjustments: number;
  deliveryFee: number;
  deliveryMethod: "delivery" | "pickup";
  deliveryDate: string;
  deliveryTime: string;
  specialInstructions: string;
  paymentMethod: string;
  orderNotes: string;
  deliveryNotes: string;
  purchaseOrder: string;
  deliveryAddress: string;
  sameAsBilling: boolean;
  onBack: () => void;
  onConfirm: () => void;
  isCreating: boolean;
  onDeliveryFeeChange?: (fee: number) => void;
  onOrderNotesChange?: (notes: string) => void;
  onDeliveryNotesChange?: (notes: string) => void;
  onPurchaseOrderChange?: (purchaseOrder: string) => void;
  onUpdateSplit?: (splitIndex: number, updates: Partial<SplitConfig>) => void;
  isDeliveryFeeManuallySet?: boolean;
  deliveryFeeInfo?: {
    suburbName: string;
    displayText: string;
  } | null;
}

export function OrderReviewStep({
  customer,
  selectedContact,
  cart,
  splits = [],
  orderType = "single",
  subtotal,
  adjustments,
  deliveryFee,
  deliveryMethod,
  deliveryDate,
  deliveryTime,
  specialInstructions,
  paymentMethod,
  orderNotes,
  deliveryNotes,
  purchaseOrder,
  deliveryAddress,
  sameAsBilling,
  onBack,
  onConfirm,
  isCreating,
  onDeliveryFeeChange,
  onOrderNotesChange,
  onDeliveryNotesChange,
  onPurchaseOrderChange,
  onUpdateSplit,
  isDeliveryFeeManuallySet = false,
  deliveryFeeInfo,
}: OrderReviewStepProps) {
  const { data: paymentSettings } = usePaymentSettings();
  const stepNumber = deliveryMethod === "pickup" ? "5" : "7";

  const splitCount = orderType === "split" && splits.length > 0 ? splits.length : 1;

  const orderTotals = paymentSettings
    ? calculateOrderTotals(subtotal, adjustments, deliveryFee, paymentMethod, paymentSettings, deliveryMethod, splitCount)
    : {
        subtotal,
        adjustments,
        deliveryFee,
        fuelSurcharge: 0,
        fuelSurchargePerUnit: 0,
        splitCount: 1,
        surchargeAmount: 0,
        gstAmount: (subtotal + adjustments + deliveryFee) / 11,
        totalAmount: subtotal + adjustments + deliveryFee,
        hasSurcharge: false,
        surchargeRate: 0,
        gstRate: 10,
        gstIncluded: true,
      };

  const getPaymentMethodLabel = (method: string) => {
    const labels: { [key: string]: string } = {
      cash: "Cash",
      card_on_file: "Card on File",
      invoice: "Invoice",
      "7_day_invoice": "7 Day Invoice",
      in_yard_cash: "In Yard - Cash",
      in_yard_card: "In Yard - Card",
      account_cash: "Account - Cash",
      account_card: "Account - Card",
      cod: "Cash on Delivery",
    };
    return labels[method] || method;
  };

  const actualDeliveryAddress = sameAsBilling ? customer.full_address : deliveryAddress;

  const getDisplayInfo = () => {
    const personalName = [customer.first_name, customer.last_name].filter(Boolean).join(" ").trim();
    if (customer.customer_type === "account" && customer.company_name) {
      return { displayName: customer.company_name, contactInfo: personalName || null, isCompany: true };
    }
    if (customer.entity_type === "individual" && personalName) {
      return { displayName: personalName, contactInfo: null, isCompany: false };
    }
    if (customer.business_name) {
      return { displayName: customer.business_name, contactInfo: personalName || null, isCompany: true };
    }
    if (customer.company_name) {
      return { displayName: customer.company_name, contactInfo: personalName || null, isCompany: true };
    }
    if (personalName) {
      return { displayName: personalName, contactInfo: null, isCompany: false };
    }
    return { displayName: "Customer", contactInfo: null, isCompany: false };
  };

  const { displayName, contactInfo, isCompany } = getDisplayInfo();

  const formatTimeLabel = (time: string) => {
    if (!time) return "—";
    return time.replace(/^1h-/, "");
  };

  const splitAddressLine = (split: SplitConfig) => {
    if (split.sameAsBilling) return customer.full_address;
    return split.deliveryAddress || "Not set";
  };

  const missingDeliveryFee =
    deliveryMethod === "delivery" && !!deliveryFeeInfo && (!deliveryFee || deliveryFee <= 0);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-primary" />
          Step {stepNumber}: Review Order
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Verify details {orderType === "split" ? "and per-split delivery info " : ""}before confirming. Tap the pencil to edit.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* MAIN COLUMN */}
        <div className="space-y-6 min-w-0">
          {/* Customer + Billing */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-card border border-border rounded-xl">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                {isCompany ? <Building className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                Customer
              </h3>
              <p className="text-foreground font-semibold">{displayName}</p>
              {contactInfo && <p className="text-xs text-muted-foreground mt-0.5">Contact: {contactInfo}</p>}
              {customer.email && <p className="text-xs text-muted-foreground">{customer.email}</p>}
              {customer.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
              {selectedContact && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Order Contact
                  </p>
                  <p className="text-sm font-medium">{selectedContact.name}</p>
                  {selectedContact.role && <p className="text-xs text-muted-foreground">{selectedContact.role}</p>}
                  {selectedContact.phone && <p className="text-xs text-muted-foreground">{selectedContact.phone}</p>}
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-border">
                <Label htmlFor="purchase-order" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
                  <Receipt className="w-3 h-3" /> Purchase Order #
                </Label>
                <Input
                  id="purchase-order"
                  value={purchaseOrder}
                  onChange={(e) => onPurchaseOrderChange?.(e.target.value)}
                  placeholder="Optional"
                  disabled={isCreating}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="p-5 bg-card border border-border rounded-xl">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5" />
                Billing Address
              </h3>
              <p className="text-sm text-foreground leading-relaxed">{customer.full_address}</p>
              {customer.suburb && (
                <p className="text-xs text-muted-foreground mt-1">
                  {customer.suburb.name}, {customer.suburb.state}
                </p>
              )}
              {deliveryMethod === "delivery" && orderType !== "split" && (
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Delivery Address
                  </p>
                  <p className="text-sm text-foreground">{actualDeliveryAddress}</p>
                  <Badge variant={sameAsBilling ? "outline" : "secondary"} className="mt-2 text-[10px]">
                    {sameAsBilling ? "Same as billing" : "Different from billing"}
                  </Badge>
                </div>
              )}
            </div>
          </section>

          {/* SPLIT SHIPMENTS */}
          {orderType === "split" ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Package className="w-4 h-4" /> Split Shipments
                </h2>
                <Badge variant="secondary" className="text-xs font-bold">
                  {splits.length} {splits.length === 1 ? "Split" : "Splits"}
                </Badge>
              </div>

              {splits.map((split, splitIndex) => (
                <div key={split.id ?? splitIndex} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                  {/* Header strip */}
                  <div className="bg-muted/60 px-4 py-2.5 border-b border-border flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-bold text-foreground uppercase tracking-wide truncate">
                        {split.name}
                      </span>
                      {deliveryMethod === "delivery" && <SplitAddressBadge split={split} customer={customer} />}
                    </div>
                    {deliveryMethod === "delivery" && (
                      <Badge variant="outline" className="text-xs font-semibold whitespace-nowrap">
                        Delivery: AU${(split.deliveryFee || 0).toFixed(2)}
                      </Badge>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-4">
                    {/* Items */}
                    <div className="space-y-1.5">
                      {split.products.map((sp: any, pi: number) => {
                        const ci = cart.find((c) => c.product.id === sp.productId);
                        if (!ci) return null;
                        const total = ci.unit_price * sp.quantity;
                        const orig = (ci.product as any).price;
                        const discounted = typeof orig === "number" && orig > ci.unit_price + 0.001;
                        return (
                          <div key={pi} className="flex justify-between items-baseline gap-2 text-sm">
                            <div className="min-w-0">
                              <span className="text-foreground font-medium">{ci.product.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {discounted && (
                                  <span className="line-through mr-1">AU${orig.toFixed(2)}</span>
                                )}
                                <span className={discounted ? "text-destructive font-medium" : ""}>
                                  AU${ci.unit_price.toFixed(2)}
                                </span>
                                <span className="ml-1">× {sp.quantity}</span>
                              </span>
                            </div>
                            <span className="font-semibold text-foreground whitespace-nowrap">
                              AU${total.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Editable grid */}
                    {deliveryMethod === "delivery" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border">
                        {/* Address */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> Delivery Address
                            </Label>
                            {onUpdateSplit && (
                              <EditAddressPopover
                                split={split}
                                splitIndex={splitIndex}
                                onUpdateSplit={onUpdateSplit}
                                customer={customer}
                                disabled={isCreating}
                              />
                            )}
                          </div>
                          <p className="text-sm text-foreground leading-snug break-words">
                            {splitAddressLine(split)}
                          </p>
                        </div>

                        {/* Date & Time */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Delivery Date & Time
                            </Label>
                            {onUpdateSplit && (
                              <EditSchedulePopover
                                split={split}
                                splitIndex={splitIndex}
                                onUpdateSplit={onUpdateSplit}
                                disabled={isCreating}
                              />
                            )}
                          </div>
                          <p className="text-sm text-foreground">
                            {split.deliveryDate || "Not set"}{" "}
                            <span className="text-muted-foreground">• {formatTimeLabel(split.deliveryTime)}</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Special instructions */}
                    {deliveryMethod === "delivery" && (
                      <div className="pt-3 border-t border-border">
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Special Instructions
                          </Label>
                          {onUpdateSplit && (
                            <EditInstructionsPopover
                              split={split}
                              splitIndex={splitIndex}
                              onUpdateSplit={onUpdateSplit}
                              disabled={isCreating}
                            />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground italic">
                          {split.specialInstructions || "No instructions added."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </section>
          ) : (
            // Single order products
            <section className="space-y-2">
              <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <Package className="w-4 h-4" /> Products
              </h2>
              <div className="bg-card border border-border rounded-xl divide-y divide-border">
                {cart.map((item, i) => {
                  const orig = (item.product as any).price;
                  const discounted = typeof orig === "number" && orig > item.unit_price + 0.001;
                  return (
                    <div key={i} className="flex justify-between items-center p-4">
                      <div>
                        <p className="font-medium text-foreground">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {discounted && <span className="line-through mr-1">AU${orig.toFixed(2)}</span>}
                          <span className={discounted ? "text-destructive font-medium" : ""}>
                            AU${item.unit_price.toFixed(2)}
                          </span>
                          <span className="ml-1">× {item.quantity}</span>
                        </p>
                      </div>
                      <p className="font-semibold">AU${item.total_price.toFixed(2)}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Delivery Method + Single delivery details */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-card border border-border rounded-xl">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                {deliveryMethod === "delivery" ? <MapPin className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
                Delivery Method
              </h3>
              <Badge variant={deliveryMethod === "delivery" ? "default" : "secondary"}>
                {deliveryMethod === "delivery" ? "Delivery" : "Yard Sale / Pickup"}
              </Badge>
              {deliveryMethod === "pickup" && import.meta.env.VITE_PICKUP_ADDRESS && (
                <p className="text-xs text-muted-foreground mt-2">
                  Pickup location: {import.meta.env.VITE_PICKUP_ADDRESS}
                </p>
              )}
            </div>

            {deliveryMethod === "delivery" && orderType !== "split" && deliveryDate && (
              <div className="p-4 bg-card border border-border rounded-xl">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Delivery Details
                </h3>
                <p className="text-sm text-foreground">
                  {deliveryDate} <span className="text-muted-foreground">• {formatTimeLabel(deliveryTime)}</span>
                </p>
                {specialInstructions && (
                  <p className="text-xs text-muted-foreground mt-2 italic">{specialInstructions}</p>
                )}
              </div>
            )}
          </section>

          {/* Order notes */}
          <section className="p-5 bg-card border border-border rounded-xl">
            <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> Order Notes
            </h3>
            <p className="text-[11px] text-muted-foreground mb-2">Internal notes for admins only</p>
            <Textarea
              value={orderNotes}
              onChange={(e) => onOrderNotesChange?.(e.target.value)}
              placeholder="Add any additional notes..."
              className="min-h-[70px] text-sm"
              disabled={isCreating}
            />
          </section>

          {/* Delivery notes */}
          {deliveryMethod === "delivery" && (
            <section className="p-5 bg-card border border-border rounded-xl">
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
                <Truck className="w-4 h-4" /> Delivery Notes
              </h3>
              <p className="text-[11px] text-muted-foreground mb-2">Internal notes for assigned driver only</p>
              <Textarea
                value={deliveryNotes}
                onChange={(e) => onDeliveryNotesChange?.(e.target.value)}
                placeholder="Access codes, special handling, etc."
                className="min-h-[70px] text-sm"
                disabled={isCreating}
              />
            </section>
          )}
        </div>

        {/* SIDEBAR SUMMARY */}
        <aside className="lg:sticky lg:top-4 space-y-4">
          <Card className="bg-foreground text-background border-foreground shadow-xl">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-bold tracking-tight">Order Summary</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-background/70">Subtotal</span>
                  <span className="font-medium">AU${orderTotals.subtotal.toFixed(2)}</span>
                </div>
                {orderTotals.adjustments !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-background/70">Adjustments</span>
                    <span className="font-medium">
                      {orderTotals.adjustments > 0 ? "+" : ""}AU${orderTotals.adjustments.toFixed(2)}
                    </span>
                  </div>
                )}
                {deliveryMethod === "delivery" && orderType === "split" && (
                  <div className="pt-1 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-background/70">Delivery Fees</span>
                      <span className="font-medium">AU${deliveryFee.toFixed(2)}</span>
                    </div>
                    <div className="pl-3 border-l border-background/20 space-y-0.5">
                      {splits.map((s, i) => (
                        <div key={i} className="flex justify-between text-[11px] text-background/60">
                          <span className="truncate pr-2">{s.name}</span>
                          <span>AU${(s.deliveryFee || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {deliveryMethod === "delivery" && orderType !== "split" && (
                  <div className="flex justify-between items-center">
                    <span className="text-background/70">Delivery Fee</span>
                    <div className="flex items-center gap-1">
                      <span className="text-background/70 text-xs">AU$</span>
                      <Input
                        type="number"
                        value={deliveryFee.toFixed(2)}
                        onChange={(e) => onDeliveryFeeChange?.(parseFloat(e.target.value) || 0)}
                        className="h-7 w-20 text-right text-foreground"
                        min="0"
                        step="0.01"
                        disabled={isCreating}
                      />
                    </div>
                  </div>
                )}
                {deliveryMethod === "delivery" && orderTotals.fuelSurcharge > 0 && (
                  <div className="flex justify-between text-background/70">
                    <span>Fuel Surcharge</span>
                    <span>AU${orderTotals.fuelSurcharge.toFixed(2)}</span>
                  </div>
                )}
                {orderTotals.hasSurcharge && orderTotals.surchargeAmount > 0 && (
                  <div className="flex justify-between text-background/70">
                    <span>Surcharge ({paymentSettings?.service_charge_rate || 0}%)</span>
                    <span>AU${orderTotals.surchargeAmount.toFixed(2)}</span>
                  </div>
                )}
                {orderTotals.gstAmount > 0 && (
                  <div className="flex justify-between text-background/70 text-xs">
                    <span>
                      {paymentSettings?.gst_label || "GST"} Incl. ({paymentSettings?.gst_rate || 10}%)
                    </span>
                    <span>AU${orderTotals.gstAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <Separator className="bg-background/20" />

              <div className="flex justify-between items-end">
                <span className="text-sm font-medium">Total</span>
                <span className="text-2xl font-bold tracking-tight">AU${orderTotals.totalAmount.toFixed(2)}</span>
              </div>

              {missingDeliveryFee && (
                <p className="text-xs text-destructive bg-background/95 rounded p-2">
                  Delivery fee is $0 but a suburb is selected. Reselect the suburb or enter manually.
                </p>
              )}

              <div className="space-y-2 pt-1">
                <Button
                  onClick={onConfirm}
                  disabled={isCreating || missingDeliveryFee}
                  className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  {isCreating ? "Creating Order..." : "Confirm Order"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={onBack}
                  disabled={isCreating}
                  className="w-full text-background/80 hover:text-background hover:bg-background/10"
                >
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="p-4 bg-card border border-border rounded-xl">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> Payment Method
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{getPaymentMethodLabel(paymentMethod)}</Badge>
              {orderTotals.hasSurcharge && paymentSettings && (
                <Badge variant="secondary" className="text-orange-700 bg-orange-50 dark:bg-orange-950">
                  +{paymentSettings.service_charge_rate}% surcharge
                </Badge>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
