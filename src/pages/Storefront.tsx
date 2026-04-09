import { useState } from "react";
import { AccountNumberStep } from "@/components/storefront/AccountNumberStep";
import { StorefrontOrderFlow } from "@/components/storefront/StorefrontOrderFlow";
import { ShoppingBag } from "lucide-react";

interface ValidatedCustomer {
  id: string;
  display_name: string;
  full_address: string | null;
  customer_type: string;
  email: string | null;
  phone: string | null;
  suburb_id: string | null;
}

export default function Storefront() {
  const [customer, setCustomer] = useState<ValidatedCustomer | null>(null);
  const [accountNumber, setAccountNumber] = useState("");

  const handleValidated = (cust: ValidatedCustomer, accNum: string) => {
    setCustomer(cust);
    setAccountNumber(accNum);
  };

  const handleReset = () => {
    setCustomer(null);
    setAccountNumber("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Online Ordering</h1>
            <p className="text-xs text-muted-foreground">Place your order quickly and easily</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {!customer ? (
          <AccountNumberStep onValidated={handleValidated} />
        ) : (
          <StorefrontOrderFlow customer={customer} accountNumber={accountNumber} onBack={handleReset} />
        )}
      </main>
    </div>
  );
}
