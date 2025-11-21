/**
 * Format order number for display based on whether it's a master or split order
 * 
 * @param order - Order object with order_number, master_order_id, and is_split_order
 * @returns Formatted order number string
 * 
 * Examples:
 * - Master order: "MO - ORD-531082"
 * - Split order: "ORD-531082-A"
 * - Regular order: "ORD-531082"
 */
export const formatOrderNumber = (order: {
  order_number: string;
  master_order_id?: string | null;
  is_split_order?: boolean;
}): string => {
  // Master orders (no master_order_id and is_split_order is false)
  // These are the parent orders of split orders
  if (!order.master_order_id && order.is_split_order === false) {
    return `MO - ${order.order_number}`;
  }
  
  // Split orders (have master_order_id) or regular orders
  // Split orders already include the suffix from the database (ORD-531082-A)
  return order.order_number;
};

/**
 * Check if an order is a master order
 */
export const isMasterOrder = (order: {
  master_order_id?: string | null;
  is_split_order?: boolean;
}): boolean => {
  return !order.master_order_id && order.is_split_order === false;
};

/**
 * Check if an order is a split order
 */
export const isSplitOrder = (order: {
  master_order_id?: string | null;
}): boolean => {
  return !!order.master_order_id;
};
