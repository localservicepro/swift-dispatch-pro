
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CreditCard, Calendar, Building2, MapPin, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

const PAYMENT_METHODS = [
  {
    id: 'card_on_file',
    label: 'Card On File',
    description: 'Use saved payment card',
    icon: CreditCard,
    available: true
  },
  {
    id: '7_day_invoice',
    label: '7 Day Invoice',
    description: 'Payment due within 7 days',
    icon: Calendar,
    available: true
  },
  {
    id: 'in_yard',
    label: 'In Yard',
    description: 'Pay on-site during delivery',
    icon: MapPin,
    available: true
  },
  {
    id: 'account',
    label: 'Account',
    description: 'Monthly billing for account customers',
    icon: Building2,
    available: false // Will be set based on customer type
  }
];

export function PaymentMethodStep({
  customer,
  paymentMethod,
  onPaymentMethodChange,
  onBack,
  onNext
}: PaymentMethodStepProps) {
  const isAccountCustomer = customer.customer_type === 'account';
  
  const availablePaymentMethods = PAYMENT_METHODS.map(method => ({
    ...method,
    available: method.id === 'account' ? isAccountCustomer : true
  }));

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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-900">Customer Type</span>
          </div>
          <p className="text-sm text-blue-700">
            {customer.first_name} {customer.last_name} is an{' '}
            <span className="font-semibold">{customer.customer_type}</span> customer
          </p>
        </div>

        {/* Account Customer Special Notice */}
        {isAccountCustomer && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              As an account customer, you can choose "Account" payment to be billed at the end of the month.
            </AlertDescription>
          </Alert>
        )}

        {/* Payment Method Selection */}
        <div>
          <Label className="text-base font-medium mb-4 block">Select Payment Method</Label>
          <RadioGroup 
            value={paymentMethod} 
            onValueChange={onPaymentMethodChange}
            className="space-y-3"
          >
            {availablePaymentMethods.map((method) => {
              const IconComponent = method.icon;
              return (
                <div
                  key={method.id}
                  className={`flex items-start space-x-3 rounded-lg border p-4 ${
                    method.available
                      ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      : 'border-gray-100 bg-gray-50 opacity-60'
                  } ${paymentMethod === method.id ? 'border-blue-500 bg-blue-50' : ''}`}
                >
                  <RadioGroupItem
                    value={method.id}
                    id={method.id}
                    disabled={!method.available}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <IconComponent className="w-4 h-4 text-gray-600" />
                      <Label
                        htmlFor={method.id}
                        className={`font-medium cursor-pointer ${
                          method.available ? 'text-gray-900' : 'text-gray-500'
                        }`}
                      >
                        {method.label}
                      </Label>
                      {!method.available && method.id === 'account' && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                          Account customers only
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${method.available ? 'text-gray-600' : 'text-gray-400'}`}>
                      {method.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        {/* Selected Payment Method Details */}
        {paymentMethod && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="font-medium text-green-900">Selected Payment Method</span>
            </div>
            <p className="text-sm text-green-700">
              {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}
            </p>
            {paymentMethod === 'account' && (
              <p className="text-xs text-green-600 mt-1">
                This order will be added to your monthly billing cycle.
              </p>
            )}
            {paymentMethod === '7_day_invoice' && (
              <p className="text-xs text-green-600 mt-1">
                An invoice will be sent with 7-day payment terms.
              </p>
            )}
          </div>
        )}

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
