/**
 * Two-level payment model — edge-function mirror of src/utils/paymentModel.ts.
 * Keep both files in sync.
 *
 * payment_type   = who pays / how they are billed (drives statement eligibility)
 * payment_method = how this single transaction settled
 */

export const ACCOUNT_PAYMENT_TYPES = ["30_day_account", "7_day_account"];
export const NON_ACCOUNT_PAYMENT_TYPES = ["prepaid", "cod", "card_on_file"];

export const isAccountPaymentType = (paymentType?: string | null): boolean =>
  !!paymentType && ACCOUNT_PAYMENT_TYPES.includes(paymentType);

export const isExplicitNonAccountPaymentType = (paymentType?: string | null): boolean =>
  !!paymentType && NON_ACCOUNT_PAYMENT_TYPES.includes(paymentType);

/**
 * Keyed off the customer's account standing, so an order can never drop off a
 * statement merely because the order-level flag is missing or was corrupted by
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
