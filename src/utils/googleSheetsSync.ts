import { supabase } from "@/integrations/supabase/client";

/**
 * Shared Google Sheets bulk sync helper.
 * Invokes the edge function's 'sync-bulk' action which fetches orders
 * server-side with proper customer joins (for company_name).
 *
 * @param silent - If true, errors are only logged (no throw). Default: true.
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
