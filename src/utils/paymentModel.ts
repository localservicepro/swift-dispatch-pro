/**
 * Two-level payment model (Batch 0).
 *
 * payment_type   = WHO pays / how they are billed (account-level, derived from
 *                  the customer with an explicit override). Drives statement
 *                  eligibility.
 * payment_method = HOW this single transaction settled (per-order).
 *
 * Statement eligibility is decided by payment_type only — never by payment_method.
 */

export type PaymentType =
  | "30_day_account"
  | "7_day_account"
  | "prepaid"
  | "cod"
  | "card_on_file"
  // legacy values still present in historical data
  | "residential"
  | "trade";

/** Billing terms that put an order on a monthly statement. */
export const ACCOUNT_PAYMENT_TYPES = ["30_day_account", "7_day_account"] as const;

/**
 * Values that explicitly mean "settled outside the account", so they are kept
 * off statements even for an account customer. Anything else (null, or a legacy
 * value such as `residential`/`trade` left behind by the 24 Jul backfill) is
 * treated as unknown and still included for an account customer.
 */
export const NON_ACCOUNT_PAYMENT_TYPES = ["prepaid", "cod", "card_on_file"] as const;

/** Canonical per-transaction settlement vocabulary. */
export const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "cod", label: "COD - Cash on Delivery" },
  { value: "card_on_file", label: "Card on File" },
  { value: "direct_debit", label: "Direct Debit" },
  { value: "invoice", label: "Invoice" },
  { value: "on_account", label: "On Account" },
  // retained so existing stored values keep a readable label
  { value: "7_day_invoice", label: "7 Day Invoice" },
  { value: "in_yard_cash", label: "In Yard - Cash" },
  { value: "in_yard_card", label: "In Yard - Card" },
  { value: "account_cash", label: "Account - Cash" },
  { value: "account_card", label: "Account - Card" },
] as const;

export const isKnownPaymentMethod = (value?: string | null): boolean =>
  !!value && PAYMENT_METHOD_OPTIONS.some((o) => o.value === value);

export const isAccountPaymentType = (paymentType?: string | null): boolean =>
  !!paymentType && (ACCOUNT_PAYMENT_TYPES as readonly string[]).includes(paymentType);

export const isExplicitNonAccountPaymentType = (paymentType?: string | null): boolean =>
  !!paymentType && (NON_ACCOUNT_PAYMENT_TYPES as readonly string[]).includes(paymentType);

/**
 * Resolve the payment_type to store on an order.
 *
 * Order of precedence:
 *  1. an explicit override chosen by staff
 *  2. a settlement method that unambiguously implies non-account terms
 *  3. the customer's account standing
 *
 * Shared by every write path (standard, split, backorder, yard sale and the
 * future yard-sale fast track) so no path can create an unflagged account order.
 */
export function resolvePaymentType(args: {
  customerType?: string | null;
  paymentMethod?: string | null;
  explicitPaymentType?: string | null;
}): PaymentType {
  const { customerType, paymentMethod, explicitPaymentType } = args;

  if (explicitPaymentType) return explicitPaymentType as PaymentType;

  if (paymentMethod === "cod") return "cod";
  if (paymentMethod === "card_on_file") return "card_on_file";
  if (paymentMethod === "7_day_invoice") return "7_day_account";

  if (customerType === "account") return "30_day_account";

  return "prepaid";
}

/**
 * Should this order appear on the customer's monthly statement?
 *
 * Keyed off the customer's account standing so an order can never drop off a
 * statement merely because the order-level flag was missing or was corrupted by
 * the 24 Jul backfill.
 */
export function isStatementEligible(args: {
  customerType?: string | null;
  paymentType?: string | null;
}): boolean {
  const { customerType, paymentType } = args;

  if (isAccountPaymentType(paymentType)) return true;
  if (customerType !== "account") return false;

  return !isExplicitNonAccountPaymentType(paymentType);
}
