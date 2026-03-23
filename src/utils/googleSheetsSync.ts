import { supabase } from "@/integrations/supabase/client";

/**
 * Shared Google Sheets bulk sync helper.
 * Fetches all non-deleted orders from DB and invokes the same
 * 'sync-bulk' action that the manual "Sync to Sheets" button uses.
 *
 * @param silent - If true, errors are only logged (no throw). Default: true.
 * @returns { success: boolean, synced?: number, error?: string }
 */
export async function syncAllOrdersToSheets(silent = true): Promise<{ success: boolean; synced?: number; error?: string }> {
  try {
    // Fetch all non-deleted orders (same query the button would use)
    const { data: orders, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (fetchErr) {
      console.error('[Google Sheets] Failed to fetch orders for bulk sync:', fetchErr);
      if (!silent) throw fetchErr;
      return { success: false, error: fetchErr.message };
    }

    console.log(`[Google Sheets] Bulk syncing ${orders?.length ?? 0} orders...`);

    const { data, error } = await supabase.functions.invoke('google-sheets-sync', {
      body: { action: 'sync-bulk', orders },
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
