import { Product } from "@/components/order/types";

/**
 * Check if a product's category allows fractional quantities
 */
export const isBulkCategory = (product: Product): boolean => {
  return product.category?.allows_fractional_quantities ?? false;
};

/**
 * Get the appropriate quantity increment for a product
 */
export const getQuantityIncrement = (product: Product): number => {
  return isBulkCategory(product) ? 0.25 : 1.0;
};

/**
 * Get the minimum quantity allowed for a product
 */
export const getMinimumQuantity = (product: Product): number => {
  return isBulkCategory(product) ? 0.25 : 1.0;
};

/**
 * Validate a quantity for a specific product
 */
export const validateQuantity = (quantity: number, product: Product): boolean => {
  const minQuantity = getMinimumQuantity(product);
  const increment = getQuantityIncrement(product);
  
  if (quantity < minQuantity) {
    return false;
  }
  
  // For non-bulk products, ensure it's a whole number
  if (!isBulkCategory(product)) {
    return Number.isInteger(quantity);
  }
  
  // For bulk products, ensure it's a multiple of 0.25
  return (quantity * 4) % 1 === 0;
};

/**
 * Round quantity to the nearest valid increment for a product
 */
export const roundToValidQuantity = (quantity: number, product: Product): number => {
  const increment = getQuantityIncrement(product);
  const minQuantity = getMinimumQuantity(product);
  
  if (quantity < minQuantity) {
    return minQuantity;
  }
  
  if (!isBulkCategory(product)) {
    return Math.round(quantity);
  }
  
  // Round to nearest 0.25 for bulk products
  return Math.round(quantity * 4) / 4;
};

/**
 * Get an appropriate error message for invalid quantities
 */
export const getQuantityErrorMessage = (product: Product): string => {
  if (isBulkCategory(product)) {
    return "Fractional quantities allowed for bulk products (minimum 0.25)";
  }
  return "Please enter whole numbers only for this product type";
};