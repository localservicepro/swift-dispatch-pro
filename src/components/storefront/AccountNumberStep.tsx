import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { KeyRound, CheckCircle2, Loader2, AlertCircle, ArrowLeft, ArrowRight, Shield } from "lucide-react";

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
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardContent className="p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Verify Your Account</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your account number to complete your order
              </p>
            </div>
          </div>

          {/* Back button */}
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="w-full justify-start text-muted-foreground">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back to products
            </Button>
          )}

          {/* Input */}
          <div className="space-y-2">
            <Label htmlFor="account-number" className="text-xs font-medium">
              Account Number
            </Label>
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
              className="text-center text-xl tracking-[0.3em] font-mono h-12 rounded-xl bg-muted/50 border-border/60"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 text-sm text-destructive bg-destructive/10 p-3.5 rounded-xl">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Validated Customer */}
          {validatedCustomer && (
            <div className="flex items-center gap-3 text-sm bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 p-4 rounded-xl border border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">{validatedCustomer.display_name}</p>
                {validatedCustomer.full_address && (
                  <p className="text-xs opacity-75 mt-0.5">{validatedCustomer.full_address}</p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {!validatedCustomer ? (
            <Button
              onClick={handleValidate}
              disabled={isValidating || !accountNumber.trim()}
              className="w-full h-12 rounded-xl text-base font-semibold"
            >
              {isValidating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                "Verify Account"
              )}
            </Button>
          ) : (
            <Button
              onClick={handleContinue}
              className="w-full h-12 rounded-xl text-base font-semibold"
            >
              Continue to Checkout
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
