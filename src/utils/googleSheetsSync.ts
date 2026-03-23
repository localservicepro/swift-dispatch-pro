import { supabase } from "@/integrations/supabase/client";

/**
 * Shared Google Sheets bulk sync helper.
 * Invokes the edge function's 'sync-bulk' action which fetches orders
 * server-side with proper customer joins (for company_name).
 */
export async function syncAllOrdersToSheets(silent = true): Promise<{ success: boolean; synced?: number; error?: string }> {
  try {
    console.log('[Google Sheets] Triggering bulk sync (server-side fetch)...');
    const { data, error } = await supabase.functions.invoke('google-sheets-sync', {
      body: { action: 'sync-bulk' },
    });
    if (error) {
      console.error('[Google Sheets] Bulk sync edge-function error:', error);
      if (!silent) throw error;
      return { success: false, error: error.message };
    }
    if (!data?.success) {
      const msg = data?.error || 'Sync failed';
      console.error('[Google Sheets] Bulk sync returned failure:', msg);
      if (!silent) throw new Error(msg);
      return { success: false, error: msg };
    }
    console.log(`[Google Sheets] Bulk sync complete – ${data.synced} orders synced`);
    return { success: true, synced: data.synced };
  } catch (err: any) {
    console.error('[Google Sheets] Unexpected bulk sync error:', err);
    if (!silent) throw err;
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
