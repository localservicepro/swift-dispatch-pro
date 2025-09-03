import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerCreditSelector } from "@/components/customer/CustomerCreditSelector";
import { useState } from "react";
import { CreditCard } from "lucide-react";

interface CustomerCreditSectionProps {
  customerId?: string;
  orderTotal?: number;
  onCreditsSelected?: (credits: { creditId: string; amount: number }[]) => void;
}

export function CustomerCreditSection({ 
  customerId, 
  orderTotal, 
  onCreditsSelected 
}: CustomerCreditSectionProps) {
  const [selectedCredits, setSelectedCredits] = useState<{ creditId: string; amount: number }[]>([]);

  const handleCreditsSelected = (credits: { creditId: string; amount: number }[]) => {
    setSelectedCredits(credits);
    if (onCreditsSelected) {
      onCreditsSelected(credits);
    }
  };

  if (!customerId) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Customer Credits
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CustomerCreditSelector
          customerId={customerId}
          maxAmount={orderTotal}
          onCreditsSelected={handleCreditsSelected}
        />
      </CardContent>
    </Card>
  );
}