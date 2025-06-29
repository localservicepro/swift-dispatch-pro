
// Helper service for formatting order products into readable text
export const formatProductsToText = (products: any[]): string => {
  if (!products || products.length === 0) {
    return 'No products';
  }

  return products.map(product => {
    const name = product.name || product.product_name || 'Product';
    const price = product.price || product.unit_price || 0;
    const quantity = product.quantity || 1;
    
    return `${name} $${price} (Qty: ${quantity})`;
  }).join(', ');
};

// Convert CartItem array to the format expected by the database trigger
export const serializeCartItemsWithFormatting = (cart: any[]) => {
  return cart.map(item => ({
    id: item.product?.id || item.id,
    name: item.product?.name || item.name,
    price: item.unit_price || item.price,
    quantity: parseFloat(item.quantity.toString()),
    total_price: item.total_price || (item.unit_price * item.quantity)
  }));
};
