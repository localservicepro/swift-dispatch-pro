import { Product } from "@/components/order/types";

/**
 * Fix floating-point precision issues by rounding to 3 decimal places
 */
export const fixPrecision = (value: number): number => {
  return Math.round(value * 1000) / 1000;
};

/**
 * Check if a quantity is effectively zero (accounting for floating-point precision issues)
 */
export const isEffectivelyZero = (value: number): boolean => {
  return Math.abs(value) < 0.0001;
};

/**
 * Check if a product's category allows fractional quantities
 */
export const isBulkCategory = (product: Product): boolean => {
  return product.category?.allows_fractional_quantities ?? false;
};

/**
 * Get the appropriate quantity increment for + and - buttons (always whole numbers)
 */
export const getQuantityIncrement = (product: Product): number => {
  return 1.0; // Always use whole number increments for buttons
};

/**
 * Get the step value for quantity input fields
 */
export const getQuantityInputStep = (product: Product): number => {
  return isBulkCategory(product) ? 0.001 : 1.0;
};

/**
 * Get the minimum quantity allowed for a product
 */
export const getMinimumQuantity = (product: Product): number => {
  return isBulkCategory(product) ? 0.001 : 1.0;
};

/**
 * Get the default quantity when adding a product to cart
 * This is different from minimum - it's a practical starting point
 */
export const getDefaultQuantity = (product: Product): number => {
  return 1.0; // Default to 1 unit for all products (practical starting amount)
};

/**
 * Validate a quantity for a specific product
 */
export const validateQuantity = (quantity: number, product: Product): boolean => {
  const minQuantity = getMinimumQuantity(product);
  
  if (quantity < minQuantity) {
    return false;
  }
  
  // For non-fractional products, ensure it's a whole number
  if (!isBulkCategory(product)) {
    return Number.isInteger(quantity);
  }
  
  // For fractional products, allow any reasonable decimal (up to 3 decimal places)
  return Number.isFinite(quantity) && quantity > 0;
};

/**
 * Round quantity to the nearest valid increment for a product
 */
export const roundToValidQuantity = (quantity: number, product: Product): number => {
  const minQuantity = getMinimumQuantity(product);
  
  if (quantity < minQuantity) {
    return minQuantity;
  }
  
  if (!isBulkCategory(product)) {
    return Math.round(quantity);
  }
  
  // Round to 3 decimal places for fractional products
  return Math.round(quantity * 1000) / 1000;
};

/**
 * Get an appropriate error message for invalid quantities
 */
export const getQuantityErrorMessage = (product: Product): string => {
  if (isBulkCategory(product)) {
    return "Any decimal quantity allowed (minimum 0.001)";
  }
  return "Please enter whole numbers only for this product type";
};