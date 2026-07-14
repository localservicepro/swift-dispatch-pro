import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCustomerCredits } from "@/hooks/useCustomerCredits";
import { formatCurrency } from "@/components/order/utils/paymentCalculations";
import { CreditCard, DollarSign } from "lucide-react";

interface CustomerCreditSelectorProps {
  customerId: string;
  onCreditsSelected: (selectedCredits: { creditId: string; amount: number }[]) => void;
  maxAmount?: number;
}

export function CustomerCreditSelector({ 
  customerId, 
  onCreditsSelected, 
  maxAmount 
}: CustomerCreditSelectorProps) {
  const { availableCredits, totalAvailableCredit, isLoading } = useCustomerCredits(customerId);
  const [selectedCredits, setSelectedCredits] = useState<{ [creditId: string]: number }>({});

  const handleCreditToggle = (creditId: string, creditAmount: number) => {
    const newSelected = { ...selectedCredits };
    
    if (creditId in newSelected) {
      delete newSelected[creditId];
    } else {
      newSelected[creditId] = creditAmount;
    }
    
    setSelectedCredits(newSelected);
    
    // Convert to array format and notify parent
    const creditsArray = Object.entries(newSelected).map(([id, amount]) => ({
      creditId: id,
      amount
    }));
    
    onCreditsSelected(creditsArray);
  };

  const handleAmountChange = (creditId: string, amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    const credit = availableCredits.find(c => c.id === creditId);
    
    if (!credit) return;
    
    const maxCreditAmount = Math.min(credit.amount, maxAmount || Infinity);
    const actualAmount = Math.min(numAmount, maxCreditAmount);
    
    const newSelected = { ...selectedCredits };
    
    if (actualAmount > 0) {
      newSelected[creditId] = actualAmount;
    } else {
      delete newSelected[creditId];
    }
    
    setSelectedCredits(newSelected);
    
    const creditsArray = Object.entries(newSelected).map(([id, amount]) => ({
      creditId: id,
      amount
    }));
    
    onCreditsSelected(creditsArray);
  };

  const totalSelectedAmount = Object.values(selectedCredits).reduce((sum, amount) => sum + amount, 0);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading available credits...</div>;
  }

  if (availableCredits.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Available Credits
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          Total: {formatCurrency(totalAvailableCredit)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {availableCredits.map((credit) => {
            const isSelected = credit.id in selectedCredits;
            const maxCreditAmount = Math.min(credit.amount, maxAmount || Infinity);
            
            return (
              <div key={credit.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={credit.id}
                      checked={isSelected}
                      onCheckedChange={() => handleCreditToggle(credit.id, maxCreditAmount)}
                    />
                    <Label htmlFor={credit.id} className="flex items-center gap-2">
                      <span className="font-medium">Credit #{credit.id.slice(0, 8)}</span>
                      <Badge variant="outline" className="text-xs">
                        {formatCurrency(credit.amount)} available
                      </Badge>
                    </Label>
                  </div>
                </div>

                {isSelected && (
                  <div className="ml-6 space-y-2">
                    <Label htmlFor={`amount-${credit.id}`} className="text-sm">
                      Amount to use (max: {formatCurrency(maxCreditAmount)})
                    </Label>
                    <Input
                      id={`amount-${credit.id}`}
                      type="number"
                      min="0"
                      max={maxCreditAmount}
                      step="0.01"
                      value={selectedCredits[credit.id] || ''}
                      onChange={(e) => handleAmountChange(credit.id, e.target.value)}
                      placeholder="Enter amount"
                      className="w-32"
                    />
                  </div>
                )}

                {credit.description && (
                  <div className="text-sm text-muted-foreground ml-6">
                    {credit.description}
                  </div>
                )}

                <div className="text-xs text-muted-foreground ml-6">
                  Created: {new Date(credit.created_at).toLocaleDateString('en-AU')}
                  {credit.expires_at && (
                    <span className="ml-2">
                      • Expires: {new Date(credit.expires_at).toLocaleDateString('en-AU')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {totalSelectedAmount > 0 && (
          <div className="bg-primary/10 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium">Total Credit Selected:</span>
              <span className="font-bold text-primary">
                {formatCurrency(totalSelectedAmount)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}