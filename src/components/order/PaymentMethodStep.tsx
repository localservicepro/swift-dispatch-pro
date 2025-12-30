
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Label } from "@/components/ui/label";
import { CreditCard, Calendar, Building2, MapPin, AlertCircle, Check, Wallet, HandCoins, Truck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCustomerPaymentMethods } from "@/hooks/useCustomerPaymentMethods";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";

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
    available: false, // Will be set based on saved cards
    hasSurcharge: true
  },
  {
    id: '7_day_invoice',
    label: '7 Day Invoice',
    description: 'Payment due within 7 days',
    icon: Calendar,
    available: true,
    hasSurcharge: true
  },
  {
    id: 'cod',
    label: 'COD - Cash on Delivery',
    description: 'Driver collects cash payment upon delivery',
    icon: Truck,
    available: true,
    hasSurcharge: false
  },
  {
    id: 'in_yard_cash',
    label: 'In Yard - Cash',
    description: 'Pay cash on-site during delivery',
    icon: HandCoins,
    available: true,
    hasSurcharge: false
  },
  {
    id: 'in_yard_card',
    label: 'In Yard - Card',
    description: 'Pay by card on-site during delivery',
    icon: CreditCard,
    available: true,
    hasSurcharge: true
  },
  {
    id: 'account_cash',
    label: 'Account - Cash',
    description: 'Monthly billing - cash payment',
    icon: Wallet,
    available: false, // Will be set based on customer type
    hasSurcharge: false
  },
  {
    id: 'account_card',
    label: 'Account - Card',
    description: 'Monthly billing - card payment',
    icon: Building2,
    available: false, // Will be set based on customer type
    hasSurcharge: true
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
  
  // Fetch customer's saved payment methods
  const { data: savedCards = [], isLoading: isLoadingCards } = useCustomerPaymentMethods(customer.id);
  const hasCardOnFile = savedCards.length > 0;
  const defaultCard = savedCards.find(card => card.is_default);
  
  // Fetch payment settings for surcharge information
  const { data: paymentSettings, isLoading: isLoadingSettings } = usePaymentSettings();
  
  const availablePaymentMethods = PAYMENT_METHODS.map(method => ({
    ...method,
    available: method.id === 'account_cash' || method.id === 'account_card' ? isAccountCustomer : 
               method.id === 'card_on_file' ? hasCardOnFile : 
               true
  }));

  const handleNext = () => {
    if (!paymentMethod) {
      return;
    }
    onNext();
  };

  const formatCardBrand = (brand: string) => {
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  const getSurchargeText = () => {
    if (!paymentSettings) return '';
    return `${paymentSettings.service_charge_rate}% surcharge applies`;
  };

  if (isLoadingSettings) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading payment options...</div>
        </CardContent>
      </Card>
    );
  }

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
          {hasCardOnFile && (
            <p className="text-xs text-blue-600 mt-1">
              • {savedCards.length} saved payment method{savedCards.length !== 1 ? 's' : ''} on file
            </p>
          )}
        </div>

        {/* Surcharge Information */}
        {paymentSettings && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {getSurchargeText()} to card payments and invoices. Cash payments have no surcharge.
            </AlertDescription>
          </Alert>
        )}

        {/* Account Customer Special Notice */}
        {isAccountCustomer && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              As an account customer, you can choose account payment options to be billed at the end of the month.
            </AlertDescription>
          </Alert>
        )}

        {/* Card on File Notice for new customers */}
        {!hasCardOnFile && !isLoadingCards && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No saved payment methods found. Complete an order with card payment to save a card for future "Card on File" orders.
            </AlertDescription>
          </Alert>
        )}

        {/* Payment Method Selection */}
        <div>
          <Label className="text-base font-medium mb-4 block">Select Payment Method</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availablePaymentMethods.map((method) => {
              const IconComponent = method.icon;
              const isSelected = paymentMethod === method.id;
              return (
                <div
                  key={method.id}
                  onClick={() => method.available && onPaymentMethodChange(method.id)}
                  className={`relative rounded-lg border p-4 transition-all duration-200 ${
                    method.available
                      ? 'cursor-pointer hover:border-primary hover:bg-primary/5'
                      : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                  } ${isSelected ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'border-gray-200'}`}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <IconComponent className={`w-5 h-5 mt-1 ${method.available ? 'text-primary' : 'text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`font-medium ${method.available ? 'text-gray-900' : 'text-gray-500'}`}>
                          {method.label}
                        </span>
                        {method.hasSurcharge && paymentSettings && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded">
                            +{paymentSettings.service_charge_rate}%
                          </span>
                        )}
                        {!method.available && (method.id === 'account_cash' || method.id === 'account_card') && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                            Account only
                          </span>
                        )}
                        {!method.available && method.id === 'card_on_file' && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                            No saved cards
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${method.available ? 'text-gray-600' : 'text-gray-400'}`}>
                        {method.description}
                        {method.hasSurcharge && paymentSettings && (
                          <span className="text-orange-600 ml-1">
                            (includes {paymentSettings.service_charge_rate}% surcharge)
                          </span>
                        )}
                      </p>
                      
                      {/* Show card details when Card on File is selected and available */}
                      {method.id === 'card_on_file' && method.available && isSelected && defaultCard && (
                        <div className="mt-3 p-2 bg-background border border-gray-200 rounded text-xs">
                          <div className="flex items-center gap-2">
                            <Check className="w-3 h-3 text-green-600" />
                            <span className="font-medium">
                              {formatCardBrand(defaultCard.card_brand)} •••• {defaultCard.card_last_four}
                            </span>
                            <span className="text-gray-500">
                              {defaultCard.card_exp_month.toString().padStart(2, '0')}/{defaultCard.card_exp_year}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
            {paymentMethod === 'account_cash' || paymentMethod === 'account_card' ? (
              <p className="text-xs text-green-600 mt-1">
                This order will be added to your monthly billing cycle.
              </p>
            ) : paymentMethod === '7_day_invoice' ? (
              <p className="text-xs text-green-600 mt-1">
                An invoice will be sent with 7-day payment terms.
              </p>
            ) : paymentMethod === 'card_on_file' && defaultCard ? (
              <p className="text-xs text-green-600 mt-1">
                Charge will be processed using your {formatCardBrand(defaultCard.card_brand)} ending in {defaultCard.card_last_four}.
              </p>
            ) : paymentMethod === 'cod' ? (
              <p className="text-xs text-green-600 mt-1">
                Driver will collect cash payment when delivering the order.
              </p>
            ) : null}
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
