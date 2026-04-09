import { useState } from "react";
import { AccountNumberStep } from "@/components/storefront/AccountNumberStep";
import { StorefrontOrderFlow } from "@/components/storefront/StorefrontOrderFlow";
import { StorefrontProductBrowser, StorefrontCartItem } from "@/components/storefront/StorefrontProductBrowser";
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

type StorefrontStep = "browse" | "account" | "checkout";

export default function Storefront() {
  const [step, setStep] = useState<StorefrontStep>("browse");
  const [cart, setCart] = useState<StorefrontCartItem[]>([]);
  const [customer, setCustomer] = useState<ValidatedCustomer | null>(null);
  const [accountNumber, setAccountNumber] = useState("");

  const handleProceedToCheckout = () => {
    setStep("account");
  };

  const handleValidated = (cust: ValidatedCustomer, accNum: string) => {
    setCustomer(cust);
    setAccountNumber(accNum);
    setStep("checkout");
  };

  const handleBackToBrowse = () => {
    setStep("browse");
  };

  const handleReset = () => {
    setCustomer(null);
    setAccountNumber("");
    setCart([]);
    setStep("browse");
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
        {step === "browse" && (
          <StorefrontProductBrowser
            cart={cart}
            onCartChange={setCart}
            onNext={handleProceedToCheckout}
          />
        )}
        {step === "account" && (
          <AccountNumberStep onValidated={handleValidated} onBack={handleBackToBrowse} />
        )}
        {step === "checkout" && customer && (
          <StorefrontOrderFlow
            customer={customer}
            accountNumber={accountNumber}
            cart={cart}
            onBack={handleReset}
          />
        )}
      </main>
    </div>
  );
}
