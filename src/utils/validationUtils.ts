
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

// Validate and clean product data for JSON storage - this is critical for fixing the JSON error
export const validateProductsForDatabase = (products: any[]): any[] => {
  console.log('=== PRODUCT VALIDATION START ===');
  console.log('Raw products input:', JSON.stringify(products, null, 2));

  if (!Array.isArray(products) || products.length === 0) {
    throw new Error('At least one product is required');
  }

  const validatedProducts = products.map((product, index) => {
    console.log(`Validating product ${index + 1}:`, product);

    if (!product || typeof product !== 'object') {
      throw new Error(`Product at index ${index} is invalid`);
    }

    // Handle the case where product might be nested inside a 'product' property (from CartItem)
    const productData = product.product || product;
    
    console.log(`Product data for validation:`, productData);

    if (!productData || typeof productData !== 'object') {
      throw new Error(`Product data at index ${index} is invalid`);
    }

    // Create a clean product object for database storage
    const cleanProduct = {
      id: validateRequiredString(productData.id, `Product ${index + 1} ID`),
      name: validateRequiredString(productData.name, `Product ${index + 1} name`),
      price: validateNumber(product.unit_price || productData.price, `Product ${index + 1} price`),
      quantity: validateNumber(product.quantity, `Product ${index + 1} quantity`)
    };

    console.log(`Clean product ${index + 1}:`, cleanProduct);
    return cleanProduct;
  });

  console.log('=== PRODUCT VALIDATION COMPLETED ===');
  console.log('Final validated products:', JSON.stringify(validatedProducts, null, 2));

  // Test JSON serialization to catch any issues early
  try {
    const testJson = JSON.stringify(validatedProducts);
    JSON.parse(testJson); // Verify it can be parsed back
    console.log('✅ JSON serialization test passed');
  } catch (jsonError) {
    console.error('❌ JSON serialization test failed:', jsonError);
    throw new Error(`Product data cannot be serialized to JSON: ${jsonError}`);
  }

  return validatedProducts;
};
