
export interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export type OrderType = "single" | "split";
export type TruckType = "small" | "medium" | "large" | "crane";
export type DeliveryMethod = "delivery" | "pickup";

export interface Split {
  deliveryDate: string;
  deliveryTime: string;
}

export interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  full_address: string;
}

export interface CreateOrderParams {
  selectedCustomer: Customer;
  cart: Product[];
  subtotal: number;
  adjustments: number;
  deliveryFee: number;
  deliveryMethod: DeliveryMethod;
  orderType: OrderType;
  splits: Split[];
  deliveryDate: string;
  deliveryTime: string;
  truckType: TruckType | "";
  truckId: string;
  driverId: string;
  specialInstructions: string;
  paymentMethod: string;
  deliveryAddress: string;
  sameAsBilling: boolean;
}

export interface OrderCreationResult {
  type: OrderType;
  orderNumber: string;
  orderId: string;
  splitCount?: number;
}
