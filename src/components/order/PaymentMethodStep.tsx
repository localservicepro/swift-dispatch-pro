
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CreditCard } from "lucide-react";
import { useCustomerPaymentMethods } from "@/hooks/useCustomerPaymentMethods";
import { CustomerTypeInfo } from "./components/CustomerTypeInfo";
import { PaymentMethodAlerts } from "./components/PaymentMethodAlerts";
import { PaymentMethodCard } from "./components/PaymentMethodCard";
import { SelectedPaymentInfo } from "./components/SelectedPaymentInfo";
import { getAvailablePaymentMethods } from "./utils/paymentMethodUtils";

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
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function PaymentMethodStep({
  customer,
  paymentMethod,
  onPaymentMethodChange,
  onBack,
  onNext
}: PaymentMethodStepProps) {
  const isAccountCustomer = customer.customer_type === 'account';
  
  // Fetch customer's saved payment methods
  const { data: savedCards = [], isLoading: isLoadingCards } = useCustomerPaymentMethods(customer.id);
  const hasCardOnFile = savedCards.length > 0;
  const defaultCard = savedCards.find(card => card.is_default);
  
  const availablePaymentMethods = getAvailablePaymentMethods(isAccountCustomer, hasCardOnFile);
  const selectedMethod = availablePaymentMethods.find(m => m.id === paymentMethod);

  const handleNext = () => {
    if (!paymentMethod) {
      return;
    }
    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Step 4: Select Payment Method
        </CardTitle>
        <p className="text-sm text-gray-600">
          Choose how this order will be paid for.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Customer Type Info */}
        <CustomerTypeInfo 
          customer={customer}
          hasCardOnFile={hasCardOnFile}
          savedCardsCount={savedCards.length}
        />

        {/* Payment Method Alerts */}
        <PaymentMethodAlerts 
          isAccountCustomer={isAccountCustomer}
          hasCardOnFile={hasCardOnFile}
          isLoadingCards={isLoadingCards}
        />

        {/* Payment Method Selection */}
        <div>
          <Label className="text-base font-medium mb-4 block">Select Payment Method</Label>
          <RadioGroup 
            value={paymentMethod} 
            onValueChange={onPaymentMethodChange}
            className="space-y-3"
          >
            {availablePaymentMethods.map((method) => (
              <PaymentMethodCard
                key={method.id}
                method={method}
                paymentMethod={paymentMethod}
                defaultCard={method.id === 'card_on_file' ? defaultCard : undefined}
              />
            ))}
          </RadioGroup>
        </div>

        {/* Selected Payment Method Details */}
        <SelectedPaymentInfo 
          paymentMethod={paymentMethod}
          selectedMethod={selectedMethod}
          defaultCard={defaultCard}
        />

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button 
            onClick={handleNext}
            disabled={!paymentMethod}
            className="ml-auto"
          >
            {paymentMethod ? 'Continue to Review' : 'Select Payment Method'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
