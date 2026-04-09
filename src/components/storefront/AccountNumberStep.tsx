import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface ValidatedCustomer {
  id: string;
  display_name: string;
  full_address: string | null;
  customer_type: string;
  email: string | null;
  phone: string | null;
  suburb_id: string | null;
}

interface AccountNumberStepProps {
  onValidated: (customer: ValidatedCustomer, accountNumber: string) => void;
  onBack?: () => void;
}

export function AccountNumberStep({ onValidated, onBack }: AccountNumberStepProps) {
  const [accountNumber, setAccountNumber] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatedCustomer, setValidatedCustomer] = useState<ValidatedCustomer | null>(null);

  const handleValidate = async () => {
    if (!accountNumber.trim()) {
      setError("Please enter your account number");
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("storefront-validate-account", {
        body: { account_number: accountNumber.trim() },
      });

      if (fnError) throw fnError;

      if (data?.error) {
        setError(data.error);
        setValidatedCustomer(null);
        return;
      }

      setValidatedCustomer(data.customer);
    } catch (err: any) {
      setError(err.message || "Failed to validate account. Please try again.");
      setValidatedCustomer(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleContinue = () => {
    if (validatedCustomer) {
      onValidated(validatedCustomer, accountNumber.trim());
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl">Account Login</CardTitle>
          <CardDescription>
            Enter your account number to complete your order
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
              ← Back to products
            </Button>
          )}
          <div className="space-y-2">
            <Label htmlFor="account-number">Account Number</Label>
            <Input
              id="account-number"
              placeholder="e.g. 00001"
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value.replace(/\D/g, ""));
                setError(null);
                setValidatedCustomer(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && !validatedCustomer && handleValidate()}
              maxLength={10}
              className="text-center text-lg tracking-widest font-mono"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {validatedCustomer && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-md border border-green-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">{validatedCustomer.display_name}</p>
                {validatedCustomer.full_address && (
                  <p className="text-xs text-muted-foreground mt-0.5">{validatedCustomer.full_address}</p>
                )}
              </div>
            </div>
          )}

          {!validatedCustomer ? (
            <Button onClick={handleValidate} disabled={isValidating || !accountNumber.trim()} className="w-full">
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                "Validate Account"
              )}
            </Button>
          ) : (
            <Button onClick={handleContinue} className="w-full">
              Continue to Order
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
