import { supabase } from "@/integrations/supabase/client";

/**
 * Sync a single order to the active monthly tab in Google Sheets.
 */
export async function syncSingleOrderToSheets(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[Google Sheets] Syncing single order ${orderId} to active monthly tab...`);
    const { data, error } = await supabase.functions.invoke('google-sheets-sync', {
      body: { action: 'sync-single', order_id: orderId },
    });
    if (error) {
      console.error('[Google Sheets] sync-single error:', error);
      return { success: false, error: error.message };
    }
    if (!data?.success) {
      console.error('[Google Sheets] sync-single failed:', data?.error);
      return { success: false, error: data?.error || 'Sync failed' };
    }
    console.log(`[Google Sheets] Single order synced successfully`);
    return { success: true };
  } catch (err: any) {
    console.error('[Google Sheets] Unexpected sync-single error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Sync orders for a specific month to a named sheet tab.
 */
export async function syncMonthlyOrdersToSheets(
  year: number,
  month: number,
  sheetTabName: string,
  silent = true
): Promise<{ success: boolean; synced?: number; error?: string }> {
  try {
    console.log(`[Google Sheets] Monthly sync ${year}-${month} → "${sheetTabName}"...`);
    const { data, error } = await supabase.functions.invoke('google-sheets-sync', {
      body: { action: 'sync-monthly', year, month, sheet_name: sheetTabName },
    });
    if (error) {
      console.error('[Google Sheets] Monthly sync error:', error);
      if (!silent) throw error;
      return { success: false, error: error.message };
    }
    if (!data?.success) {
      const msg = data?.error || 'Monthly sync failed';
      if (!silent) throw new Error(msg);
      return { success: false, error: msg };
    }
    console.log(`[Google Sheets] Monthly sync complete – ${data.synced} orders`);
    return { success: true, synced: data.synced };
  } catch (err: any) {
    console.error('[Google Sheets] Monthly sync error:', err);
    if (!silent) throw err;
    return { success: false, error: err.message };
  }
}
