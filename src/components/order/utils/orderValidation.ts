
import { CreateOrderParams } from "../types/orderTypes";

export const validateOrderData = (orderData: CreateOrderParams): void => {
  console.log('Validating order data:', orderData);
  
  if (!orderData.selectedCustomer) {
    throw new Error('Customer is required');
  }
  
  if (!orderData.cart || orderData.cart.length === 0) {
    throw new Error('Order must contain at least one product');
  }
  
  if (orderData.subtotal <= 0) {
    throw new Error('Order subtotal must be greater than 0');
  }

  if (!orderData.deliveryMethod) {
    throw new Error('Delivery method is required');
  }
  
  // Only validate delivery-specific fields for delivery orders
  if (orderData.deliveryMethod === "delivery") {
    if (orderData.truckType === "" || !orderData.truckType) {
      throw new Error('Truck type is required for delivery orders');
    }
    
    if (!orderData.truckId || orderData.truckId === 'none') {
      throw new Error('Truck selection is required for delivery orders');
    }
  }
  
  // Validate cart items
  orderData.cart.forEach((item, index) => {
    if (!item.id || !item.name) {
      throw new Error(`Invalid product at position ${index + 1}`);
    }
    if (!item.quantity || item.quantity <= 0) {
      throw new Error(`Invalid quantity for product: ${item.name}`);
    }
    if (item.price === undefined || item.price < 0) {
      throw new Error(`Invalid price for product: ${item.name}`);
    }
  });
  
  console.log('Order data validation passed');
};
