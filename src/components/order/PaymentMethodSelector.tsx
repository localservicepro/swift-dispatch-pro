
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Info } from "lucide-react";
import { PaymentMethodCard } from "./components/PaymentMethodCard";
import { getAvailablePaymentMethods } from "./utils/paymentMethodUtils";
import { useCustomerPaymentMethods } from "@/hooks/useCustomerPaymentMethods";

interface Customer {
  id: string;
  customer_type: string;
}

interface PaymentMethodSelectorProps {
  customer: Customer;
  currentPaymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  disabled?: boolean;
}

export function PaymentMethodSelector({ 
  customer, 
  currentPaymentMethod, 
  onPaymentMethodChange,
  disabled = false 
}: PaymentMethodSelectorProps) {
  const isAccountCustomer = customer.customer_type === 'account';
  
  // Fetch customer's saved payment methods
  const { data: savedCards = [], isLoading: isLoadingCards } = useCustomerPaymentMethods(customer.id);
  const hasCardOnFile = savedCards.length > 0;
  const defaultCard = savedCards.find(card => card.is_default);
  
  const availablePaymentMethods = getAvailablePaymentMethods(isAccountCustomer, hasCardOnFile);
  const selectedMethod = availablePaymentMethods.find(m => m.id === currentPaymentMethod);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Payment Method
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show warning if payment method changes affect surcharge */}
        {selectedMethod?.hasSurcharge && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This payment method includes a 2.5% surcharge that will be reflected in the order total.
            </AlertDescription>
          </Alert>
        )}

        <div>
          <Label className="text-sm font-medium mb-3 block">Select Payment Method</Label>
          <RadioGroup 
            value={currentPaymentMethod} 
            onValueChange={onPaymentMethodChange}
            disabled={disabled}
            className="space-y-2"
          >
            {availablePaymentMethods.map((method) => (
              <PaymentMethodCard
                key={method.id}
                method={method}
                paymentMethod={currentPaymentMethod}
                defaultCard={method.id === 'card_on_file' ? defaultCard : undefined}
              />
            ))}
          </RadioGroup>
        </div>

        {isLoadingCards && (
          <div className="text-sm text-muted-foreground">
            Loading payment methods...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
