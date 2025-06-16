
import { supabase } from "@/integrations/supabase/client";

export interface ConflictingOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_address: string;
  delivery_date: string;
  delivery_time: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflictType: 'exact' | 'overlap' | 'same-day' | 'none';
  conflictingOrders: ConflictingOrder[];
  message: string;
}

// Helper function to create time buffer (3 hours before and after for realistic delivery windows)
const createTimeBuffer = (time: string): { start: string; end: string } => {
  const [hours, minutes] = time.split(':').map(Number);
  const timeInMinutes = hours * 60 + minutes;
  
  const startMinutes = Math.max(0, timeInMinutes - 180); // 3 hours before
  const endMinutes = Math.min(1439, timeInMinutes + 180); // 3 hours after, max 23:59
  
  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };
  
  return {
    start: formatTime(startMinutes),
    end: formatTime(endMinutes)
  };
};

export const checkDriverConflicts = async (
  driverId: string,
  deliveryDate: string,
  deliveryTime: string,
  excludeOrderId?: string
): Promise<ConflictResult> => {
  if (!driverId || driverId === 'unassigned' || !deliveryDate || !deliveryTime) {
    return {
      hasConflict: false,
      conflictType: 'none',
      conflictingOrders: [],
      message: ''
    };
  }

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_address, delivery_date, delivery_time')
      .eq('driver_id', driverId)
      .eq('delivery_date', deliveryDate)
      .not('status', 'in', '(delivered,cancelled)')
      .not('id', 'eq', excludeOrderId || '');

    if (error) throw error;

    if (!orders || orders.length === 0) {
      return {
        hasConflict: false,
        conflictType: 'none',
        conflictingOrders: [],
        message: ''
      };
    }

    const exactConflicts: ConflictingOrder[] = [];
    const overlapConflicts: ConflictingOrder[] = [];
    const sameDayOrders: ConflictingOrder[] = [];

    const timeBuffer = createTimeBuffer(deliveryTime);

    for (const order of orders) {
      const orderData = {
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_address: order.customer_address,
        delivery_date: order.delivery_date || '',
        delivery_time: order.delivery_time || ''
      };

      if (order.delivery_time) {
        if (order.delivery_time === deliveryTime) {
          exactConflicts.push(orderData);
        } else if (order.delivery_time >= timeBuffer.start && order.delivery_time <= timeBuffer.end) {
          overlapConflicts.push(orderData);
        } else {
          sameDayOrders.push(orderData);
        }
      } else {
        sameDayOrders.push(orderData);
      }
    }

    // Determine conflict type and message based on actual conflicts
    if (exactConflicts.length > 0) {
      return {
        hasConflict: true,
        conflictType: 'exact',
        conflictingOrders: exactConflicts,
        message: `Driver has ${exactConflicts.length} other delivery(ies) at the exact same time`
      };
    } else if (overlapConflicts.length > 0) {
      return {
        hasConflict: true,
        conflictType: 'overlap',
        conflictingOrders: overlapConflicts,
        message: `Driver has ${overlapConflicts.length} other delivery(ies) within 3 hours of this time`
      };
    } else if (sameDayOrders.length > 0) {
      return {
        hasConflict: false, // Same day is informational only
        conflictType: 'same-day',
        conflictingOrders: sameDayOrders,
        message: `Driver has ${sameDayOrders.length} other delivery(ies) on the same day`
      };
    }

    return {
      hasConflict: false,
      conflictType: 'none',
      conflictingOrders: [],
      message: ''
    };
  } catch (error) {
    console.error('Error checking driver conflicts:', error);
    return {
      hasConflict: false,
      conflictType: 'none',
      conflictingOrders: [],
      message: ''
    };
  }
};

export const checkTruckConflicts = async (
  truckId: string,
  deliveryDate: string,
  deliveryTime: string,
  excludeOrderId?: string
): Promise<ConflictResult> => {
  if (!truckId || truckId === 'none' || !deliveryDate || !deliveryTime) {
    return {
      hasConflict: false,
      conflictType: 'none',
      conflictingOrders: [],
      message: ''
    };
  }

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_address, delivery_date, delivery_time')
      .eq('truck_id', truckId)
      .eq('delivery_date', deliveryDate)
      .not('status', 'in', '(delivered,cancelled)')
      .not('id', 'eq', excludeOrderId || '');

    if (error) throw error;

    if (!orders || orders.length === 0) {
      return {
        hasConflict: false,
        conflictType: 'none',
        conflictingOrders: [],
        message: ''
      };
    }

    const exactConflicts: ConflictingOrder[] = [];
    const overlapConflicts: ConflictingOrder[] = [];
    const sameDayOrders: ConflictingOrder[] = [];

    const timeBuffer = createTimeBuffer(deliveryTime);

    for (const order of orders) {
      const orderData = {
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_address: order.customer_address,
        delivery_date: order.delivery_date || '',
        delivery_time: order.delivery_time || ''
      };

      if (order.delivery_time) {
        if (order.delivery_time === deliveryTime) {
          exactConflicts.push(orderData);
        } else if (order.delivery_time >= timeBuffer.start && order.delivery_time <= timeBuffer.end) {
          overlapConflicts.push(orderData);
        } else {
          sameDayOrders.push(orderData);
        }
      } else {
        sameDayOrders.push(orderData);
      }
    }

    // Determine conflict type and message based on actual conflicts
    if (exactConflicts.length > 0) {
      return {
        hasConflict: true,
        conflictType: 'exact',
        conflictingOrders: exactConflicts,
        message: `Truck has ${exactConflicts.length} other delivery(ies) at the exact same time`
      };
    } else if (overlapConflicts.length > 0) {
      return {
        hasConflict: true,
        conflictType: 'overlap',
        conflictingOrders: overlapConflicts,
        message: `Truck has ${overlapConflicts.length} other delivery(ies) within 3 hours of this time`
      };
    } else if (sameDayOrders.length > 0) {
      return {
        hasConflict: false, // Same day is informational only
        conflictType: 'same-day',
        conflictingOrders: sameDayOrders,
        message: `Truck has ${sameDayOrders.length} other delivery(ies) on the same day`
      };
    }

    return {
      hasConflict: false,
      conflictType: 'none',
      conflictingOrders: [],
      message: ''
    };
  } catch (error) {
    console.error('Error checking truck conflicts:', error);
    return {
      hasConflict: false,
      conflictType: 'none',
      conflictingOrders: [],
      message: ''
    };
  }
};
