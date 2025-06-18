
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface PaymentMethodAlertsProps {
  isAccountCustomer: boolean;
  hasCardOnFile: boolean;
  isLoadingCards: boolean;
}

export function PaymentMethodAlerts({ isAccountCustomer, hasCardOnFile, isLoadingCards }: PaymentMethodAlertsProps) {
  return (
    <>
      {/* Account Customer Special Notice */}
      {isAccountCustomer && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            As an account customer, you can choose "Account" payment to be billed at the end of the month.
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

      {/* Surcharge Information */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          A credit card surcharge applies to: Card on File, 7 Day Invoice, and In Yard - Card payments.
        </AlertDescription>
      </Alert>
    </>
  );
}
