// Two-level payment classification for orders.
// - PAYMENT TYPE is the terms on which the customer pays (30 Day Account, Trade, COD, etc.)
// - PAYMENT METHOD is how the money actually arrives (Credit Card, Cash, Direct Debit, ...)
// The allowed methods depend on the selected payment type.

export type PaymentTypeId =
  | "30_day_account"
  | "7_day_account"
  | "trade"
  | "card_on_file"
  | "residential"
  | "cod";

export type PaymentMethodId =
  | "pay_credit_card"
  | "pay_direct_debit"
  | "account_cash"
  | "credit_card"
  | "direct_debit"
  | "cash";

export const PAYMENT_TYPE_LABELS: Record<PaymentTypeId, string> = {
  "30_day_account": "30 Day Account",
  "7_day_account": "7 Day Account",
  trade: "Trade",
  card_on_file: "Card on File",
  residential: "Residential",
  cod: "Cash on Delivery",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodId, string> = {
  pay_credit_card: "Pay Credit Card",
  pay_direct_debit: "Pay Direct Debit",
  account_cash: "Account Cash",
  credit_card: "Credit Card",
  direct_debit: "Direct Debit",
  cash: "Cash",
};

export const PAYMENT_TYPE_METHODS: Record<PaymentTypeId, PaymentMethodId[]> = {
  "30_day_account": ["pay_credit_card", "pay_direct_debit", "account_cash"],
  "7_day_account": ["credit_card", "direct_debit", "cash"],
  trade: ["credit_card", "direct_debit", "cash"],
  card_on_file: ["credit_card", "direct_debit", "cash"],
  residential: ["credit_card", "direct_debit", "cash"],
  cod: ["cash", "direct_debit", "credit_card"],
};

export const PAYMENT_TYPES: PaymentTypeId[] = [
  "30_day_account",
  "7_day_account",
  "trade",
  "card_on_file",
  "residential",
  "cod",
];

// Card-based methods incur the configured service charge surcharge.
const SURCHARGE_METHODS: PaymentMethodId[] = ["pay_credit_card", "credit_card"];

export function methodHasSurcharge(method: string | null | undefined): boolean {
  if (!method) return false;
  return SURCHARGE_METHODS.includes(method as PaymentMethodId);
}

export function getAllowedMethods(type: string | null | undefined): PaymentMethodId[] {
  if (!type) return [];
  return PAYMENT_TYPE_METHODS[type as PaymentTypeId] ?? [];
}

export function defaultMethodFor(type: string | null | undefined): PaymentMethodId | "" {
  const methods = getAllowedMethods(type);
  return methods[0] ?? "";
}

export function isMethodAllowed(type: string | null | undefined, method: string | null | undefined): boolean {
  if (!type || !method) return false;
  return getAllowedMethods(type).includes(method as PaymentMethodId);
}

export function labelForType(type: string | null | undefined): string {
  if (!type) return "—";
  return PAYMENT_TYPE_LABELS[type as PaymentTypeId] ?? type;
}

export function labelForMethod(method: string | null | undefined): string {
  if (!method) return "—";
  return PAYMENT_METHOD_LABELS[method as PaymentMethodId] ?? method;
}

// Best-effort inference from a legacy payment_method value (only used when
// payment_type is missing on a row — DB backfill already handled the rest).
export function inferTypeFromLegacyMethod(method: string | null | undefined): PaymentTypeId {
  switch (method) {
    case "invoice":
    case "account_cash":
    case "account_card":
      return "30_day_account";
    case "7_day_invoice":
      return "7_day_account";
    case "card_on_file":
      return "card_on_file";
    case "cod":
      return "cod";
    case "in_yard_cash":
    case "in_yard_card":
    case "cash":
    default:
      return "residential";
  }
}
