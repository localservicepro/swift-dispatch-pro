
import { CreditCard, Calendar, Building2, Banknote } from "lucide-react";

export const PAYMENT_METHODS = [
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
    description: 'Payment due within 7 days via credit card',
    icon: Calendar,
    available: true,
    hasSurcharge: true
  },
  {
    id: 'in_yard_cash',
    label: 'In Yard - Cash',
    description: 'Pay with cash on-site during pickup/delivery',
    icon: Banknote,
    available: true,
    hasSurcharge: false
  },
  {
    id: 'in_yard_card',
    label: 'In Yard - Card',
    description: 'Pay with credit card on-site during pickup/delivery',
    icon: CreditCard,
    available: true,
    hasSurcharge: true
  },
  {
    id: 'account',
    label: 'Account',
    description: 'Monthly billing for account customers',
    icon: Building2,
    available: false, // Will be set based on customer type
    hasSurcharge: false
  }
];
