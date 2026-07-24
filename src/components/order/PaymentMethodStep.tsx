import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Building2, AlertCircle, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCustomerPaymentMethods } from "@/hooks/useCustomerPaymentMethods";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";
import {
  PAYMENT_TYPES,
  PAYMENT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  getAllowedMethods,
  methodHasSurcharge,
  labelForType,
  labelForMethod,
} from "@/utils/paymentTypes";
import { useEffect } from "react";

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  full_address: string;
  customer_type: string;
  suburb_id: string;
}

interface PaymentMethodStepProps {
  customer: Customer;
  paymentType: string;
  paymentMethod: string;
  onPaymentTypeChange: (type: string) => void;
  onPaymentMethodChange: (method: string) => void;
  onBack: () => void;
  onNext: () => void;
}

const TYPE_DESCRIPTIONS: Record<string, string> = {
  "30_day_account": "Billed monthly, 30-day terms — MYOB invoice on approved accounts.",
  "7_day_account": "Billed weekly, 7-day payment terms.",
  trade: "Trade customer pricing, invoice on completion.",
  card_on_file: "Charge the customer's stored card automatically.",
  residential: "One-off residential order.",
  cod: "Driver collects payment on delivery.",
};

export function PaymentMethodStep({
  customer,
  paymentType,
  paymentMethod,
  onPaymentTypeChange,
  onPaymentMethodChange,
  onBack,
  onNext,
}: PaymentMethodStepProps) {
  const { data: savedCards = [] } = useCustomerPaymentMethods(customer.id);
  const { data: paymentSettings, isLoading: isLoadingSettings } = usePaymentSettings();
  const defaultCard = savedCards.find((c) => c.is_default) ?? savedCards[0];

  const allowedMethods = getAllowedMethods(paymentType);

  // Keep method valid when type changes.
  useEffect(() => {
    if (paymentType && allowedMethods.length > 0 && !allowedMethods.includes(paymentMethod as any)) {
      onPaymentMethodChange(allowedMethods[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentType]);

  const canContinue = !!paymentType && !!paymentMethod && allowedMethods.includes(paymentMethod as any);

  if (isLoadingSettings) {
    return (
      <Card>
        <CardContent className="p-6 text-center">Loading payment options...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Step 6: Payment Type & Method
        </CardTitle>
        <p className="text-sm text-gray-600">
          Choose the payment terms for this order, then how the money will be collected.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Customer summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-900">Customer</span>
          </div>
          <p className="text-sm text-blue-700">
            {customer.first_name} {customer.last_name}
            <span className="text-blue-500"> · {customer.customer_type}</span>
          </p>
        </div>

        {/* Payment type as visual grid */}
        <div>
          <Label className="text-base font-medium mb-3 block">Payment Type</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PAYMENT_TYPES.map((t) => {
              const isSelected = paymentType === t;
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => onPaymentTypeChange(t)}
                  className={`text-left rounded-lg border p-4 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                      : "border-gray-200 hover:border-primary/60 hover:bg-primary/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">
                      {PAYMENT_TYPE_LABELS[t]}
                    </span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{TYPE_DESCRIPTIONS[t]}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Method dropdown, dependent on type */}
        <div className="max-w-md">
          <Label htmlFor="payment-method" className="text-base font-medium mb-2 block">
            Payment Method
          </Label>
          <Select
            value={allowedMethods.includes(paymentMethod as any) ? paymentMethod : ""}
            onValueChange={onPaymentMethodChange}
          >
            <SelectTrigger id="payment-method">
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              {allowedMethods.map((m) => (
                <SelectItem key={m} value={m}>
                  <div className="flex items-center gap-2">
                    <span>{PAYMENT_METHOD_LABELS[m]}</span>
                    {methodHasSurcharge(m) && paymentSettings && (
                      <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">
                        +{paymentSettings.service_charge_rate}%
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {methodHasSurcharge(paymentMethod) && paymentSettings && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              A {paymentSettings.service_charge_rate}% surcharge will be added to card payments.
            </AlertDescription>
          </Alert>
        )}

        {paymentType === "card_on_file" && defaultCard && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Will use {defaultCard.card_brand.toUpperCase()} •••• {defaultCard.card_last_four} on file.
            </AlertDescription>
          </Alert>
        )}

        {/* Confirmation strip */}
        {canContinue && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="font-medium text-green-900">Selected</span>
            </div>
            <p className="text-sm text-green-700">
              {labelForType(paymentType)} · {labelForMethod(paymentMethod)}
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext} disabled={!canContinue} className="ml-auto">
            {canContinue ? "Continue to Review" : "Select Payment Method"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
