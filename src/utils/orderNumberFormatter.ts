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
  admin_initials?: string;
}): string => {
  let orderNumber = order.order_number;
  
  // Append creator initials if available
  if (order.admin_initials) {
    orderNumber = `${orderNumber}${order.admin_initials}`;
  }
  
  // Master orders (no master_order_id and is_split_order is false)
  // These are the parent orders of split orders
  if (!order.master_order_id && order.is_split_order === false) {
    return `MO - ${orderNumber}`;
  }
  
  // Split orders (have master_order_id) or regular orders
  // Split orders already include the suffix from the database (ORD-531082-A)
  return orderNumber;
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
