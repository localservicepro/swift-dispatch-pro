/**
 * Utility functions for consistent total amount calculations across the application
 */

interface OrderForTotal {
  subtotal?: number;
  delivery_fee?: number;
  adjustments?: number;
  total_amount: number;
}

/**
 * Calculate the correct display total for an order
 * Uses component parts when available (GST included), falls back to stored total_amount
 */
export function calculateDisplayTotal(order: OrderForTotal): number {
  // If we have component parts, calculate from them (GST included in subtotal)
  if (order.subtotal !== undefined && order.delivery_fee !== undefined) {
    return (order.subtotal || 0) + (order.delivery_fee || 0) + (order.adjustments || 0);
  }
  
  // Fallback to stored total_amount for older records without component breakdown
  return order.total_amount;
}

/**
 * Calculate GST amount that's included in the subtotal
 */
export function calculateIncludedGST(subtotal: number, gstRate: number = 10): number {
  return (subtotal / (1 + gstRate / 100)) * (gstRate / 100);
}

/**
 * Format currency amount consistently
 */
export function formatCurrency(amount: number, currency: string = 'AUD'): string {
  return `AU$${amount.toFixed(2)}`;
}