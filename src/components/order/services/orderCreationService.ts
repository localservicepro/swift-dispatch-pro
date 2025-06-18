
import { CreateOrderParams, OrderCreationResult } from "../types/orderTypes";
import { validateOrderData } from "../utils/orderValidation";
import { createSingleOrder } from "./singleOrderService";
import { createSplitOrder } from "./splitOrderService";

export async function createOrder(orderData: CreateOrderParams): Promise<OrderCreationResult> {
  console.log('Creating order with data:', orderData);

  try {
    validateOrderData(orderData);

    if (orderData.orderType === "split") {
      return await createSplitOrder(orderData);
    }

    return await createSingleOrder(orderData);

  } catch (error: any) {
    console.error('Order creation failed:', error);
    throw new Error(error.message || 'Failed to create order');
  }
}
