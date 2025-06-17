
// Validation utilities for order creation and other forms

export const validateUUID = (value: string | null | undefined): string | null => {
  if (!value || value.trim() === '') {
    return null;
  }
  
  // Basic UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new Error(`Invalid UUID format: ${value}`);
  }
  
  return value;
};

export const validateRequiredString = (value: string | null | undefined, fieldName: string): string => {
  if (!value || value.trim() === '') {
    throw new Error(`${fieldName} is required`);
  }
  return value.trim();
};

export const validateOptionalString = (value: string | null | undefined): string | null => {
  if (!value || value.trim() === '') {
    return null;
  }
  return value.trim();
};

export const validateNumber = (value: number | null | undefined, fieldName: string): number => {
  if (value === null || value === undefined || isNaN(value)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  return value;
};

export const validateOptionalNumber = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined || isNaN(value)) {
    return null;
  }
  return value;
};

// Validate and clean product data for JSON storage
export const validateProductsForDatabase = (products: any[]): any[] => {
  if (!Array.isArray(products) || products.length === 0) {
    throw new Error('At least one product is required');
  }

  return products.map((product, index) => {
    if (!product || typeof product !== 'object') {
      throw new Error(`Product at index ${index} is invalid`);
    }

    return {
      id: validateRequiredString(product.id, `Product ${index + 1} ID`),
      name: validateRequiredString(product.name, `Product ${index + 1} name`),
      price: validateNumber(product.price, `Product ${index + 1} price`),
      quantity: validateNumber(product.quantity, `Product ${index + 1} quantity`)
    };
  });
};
