/**
 * Helper utilities for order editing operations
 */

import { supabase } from "@/integrations/supabase/client";

export interface OrderEditChange {
  field: string;
  oldValue: any;
  newValue: any;
  impact: 'low' | 'medium' | 'high';
}

export interface OrderEditSummary {
  changes: OrderEditChange[];
  totalImpact: 'low' | 'medium' | 'high';
  affectsPayments: boolean;
  affectsInventory: boolean;
  recommendedActions: string[];
}

/**
 * Analyzes changes between original and updated order data
 */
export function analyzeOrderChanges(originalOrder: any, updatedData: any): OrderEditSummary {
  const changes: OrderEditChange[] = [];
  let affectsPayments = false;
  let affectsInventory = false;
  const recommendedActions: string[] = [];

  // Check total amount changes
  if (originalOrder.total_amount !== parseFloat(updatedData.total_amount)) {
    changes.push({
      field: 'total_amount',
      oldValue: originalOrder.total_amount,
      newValue: parseFloat(updatedData.total_amount),
      impact: 'high'
    });
    affectsPayments = true;
    
    if (originalOrder.payment_status === 'paid') {
      recommendedActions.push('Review payment status due to total amount change');
    }
  }

  // Check product changes
  if (JSON.stringify(originalOrder.products) !== JSON.stringify(updatedData.products)) {
    changes.push({
      field: 'products',
      oldValue: originalOrder.products,
      newValue: updatedData.products,
      impact: 'high'
    });
    affectsInventory = true;
    
    if (['delivered', 'completed'].includes(originalOrder.status)) {
      recommendedActions.push('Consider creating a return instead of modifying delivered order products');
    }
  }

  // Check status changes
  if (originalOrder.status !== updatedData.status) {
    changes.push({
      field: 'status',
      oldValue: originalOrder.status,
      newValue: updatedData.status,
      impact: 'medium'
    });
    
    if (originalOrder.status === 'delivered' && updatedData.status !== 'delivered') {
      recommendedActions.push('Changing status from delivered may affect inventory and analytics');
    }
  }

  // Check delivery information changes
  const deliveryFields = ['delivery_date', 'delivery_time', 'customer_address', 'driver_id', 'truck_id'];
  deliveryFields.forEach(field => {
    if (originalOrder[field] !== updatedData[field]) {
      changes.push({
        field,
        oldValue: originalOrder[field],
        newValue: updatedData[field],
        impact: field === 'customer_address' ? 'high' : 'medium'
      });
    }
  });

  // Determine overall impact
  const hasHighImpact = changes.some(c => c.impact === 'high');
  const hasMediumImpact = changes.some(c => c.impact === 'medium');
  const totalImpact = hasHighImpact ? 'high' : hasMediumImpact ? 'medium' : 'low';

  return {
    changes,
    totalImpact,
    affectsPayments,
    affectsInventory,
    recommendedActions
  };
}

/**
 * Handles inventory adjustments when order products change
 */
export async function handleInventoryAdjustments(
  orderId: string,
  originalProducts: any[],
  updatedProducts: any[],
  orderStatus: string
) {
  // Only adjust inventory for orders that have already been processed
  if (!['preparing', 'loading', 'en_route', 'delivered'].includes(orderStatus)) {
    return;
  }

  // Calculate quantity changes
  const productChanges = new Map();
  
  // Track original quantities
  originalProducts.forEach(product => {
    productChanges.set(product.id, { 
      original: parseFloat(product.quantity || 0), 
      updated: 0,
      productName: product.name 
    });
  });
  
  // Track updated quantities
  updatedProducts.forEach(product => {
    const existing = productChanges.get(product.id) || { original: 0, updated: 0, productName: product.name };
    existing.updated = parseFloat(product.quantity || 0);
    productChanges.set(product.id, existing);
  });

  // Apply inventory adjustments
  for (const [productId, change] of productChanges) {
    const quantityDiff = change.updated - change.original;
    
    if (quantityDiff !== 0) {
      // Positive diff means more items needed (reduce inventory)
      // Negative diff means fewer items needed (restore inventory)
      const inventoryAdjustment = -quantityDiff;
      
      if (inventoryAdjustment !== 0) {
        // Get current stock and update it
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', productId)
          .single();

        if (product) {
          const newStockQuantity = product.stock_quantity + inventoryAdjustment;
          await supabase
            .from('products')
            .update({
              stock_quantity: newStockQuantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', productId);
            
          console.log(`Inventory adjusted for ${change.productName}: ${inventoryAdjustment} units (${product.stock_quantity} → ${newStockQuantity})`);
        }
      }
    }
  }
}

/**
 * Updates related payment records when order total changes
 */
export async function updatePaymentRecords(
  orderId: string,
  oldTotal: number,
  newTotal: number,
  paymentStatus: string
) {
  if (oldTotal === newTotal) return;

  // Update pending invoices
  await supabase
    .from('invoices')
    .update({ 
      amount: newTotal,
      updated_at: new Date().toISOString()
    })
    .eq('order_id', orderId)
    .eq('status', 'pending');

  // Log payment adjustment
  console.log(`Payment records updated for order ${orderId}: ${oldTotal} -> ${newTotal}`);
}