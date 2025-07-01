
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WooCommerceProduct {
  id: number
  name: string
  slug: string
  description: string
  short_description: string
  sku: string
  price: string
  regular_price: string
  sale_price: string
  stock_quantity: number | null
  manage_stock: boolean
  stock_status: string
  weight: string
  categories: Array<{
    id: number
    name: string
    slug: string
  }>
  images: Array<{
    id: number
    src: string
    name: string
    alt: string
  }>
  date_modified: string
  date_created: string
}

interface WooCommerceCategory {
  id: number
  name: string
  slug: string
  description: string
  parent: number
}

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] [WC-SYNC] ${step}${detailsStr}`);
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    logStep('Function called', { method: req.method });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      logStep('Missing Supabase environment variables');
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      logStep('Request body parsed', requestBody);
    } catch (parseError) {
      logStep('Failed to parse request body', parseError);
      throw new Error('Invalid request body format');
    }

    const { action, settingsId } = requestBody;

    if (!action || !settingsId) {
      logStep('Missing required parameters', { action, settingsId });
      throw new Error('Missing required parameters: action and settingsId');
    }

    logStep('WooCommerce sync started', { action, settingsId });

    // Get sync settings
    const { data: settings, error: settingsError } = await supabase
      .from('woocommerce_sync_settings')
      .select('*')
      .eq('id', settingsId)
      .eq('is_active', true)
      .single()

    if (settingsError) {
      logStep('Settings query error', settingsError);
      throw new Error(`Settings query failed: ${settingsError.message}`);
    }

    if (!settings) {
      logStep('No settings found', { settingsId });
      throw new Error('WooCommerce sync settings not found or inactive')
    }

    logStep('Settings retrieved', { storeUrl: settings.store_url });

    // Validate settings
    if (!settings.store_url || !settings.consumer_key || !settings.consumer_secret) {
      logStep('Invalid settings', { 
        hasUrl: !!settings.store_url, 
        hasKey: !!settings.consumer_key, 
        hasSecret: !!settings.consumer_secret 
      });
      throw new Error('Invalid WooCommerce settings - missing required fields');
    }

    // Create sync log entry
    const { data: syncLog, error: logError } = await supabase
      .from('woocommerce_sync_logs')
      .insert({
        sync_type: action === 'full-sync' ? 'full' : 'incremental',
        direction: 'wc_to_local',
        status: 'started'
      })
      .select()
      .single()

    if (logError) {
      logStep('Failed to create sync log', logError);
      throw new Error(`Failed to create sync log: ${logError.message}`)
    }

    const syncLogId = syncLog.id;
    let stats = {
      products_processed: 0,
      products_created: 0,
      products_updated: 0,
      products_failed: 0,
      categories_processed: 0
    };

    try {
      // Set up WooCommerce API authentication
      const wcAuth = btoa(`${settings.consumer_key}:${settings.consumer_secret}`);
      const wcHeaders = {
        'Authorization': `Basic ${wcAuth}`,
        'Content-Type': 'application/json',
      };

      logStep('Testing WooCommerce connection');

      // Test connection first
      const testResponse = await fetch(
        `${settings.store_url}/wp-json/wc/v3/system_status`,
        { headers: wcHeaders }
      );

      if (!testResponse.ok) {
        logStep('WooCommerce connection test failed', { 
          status: testResponse.status, 
          statusText: testResponse.statusText,
          url: settings.store_url 
        });
        throw new Error(`WooCommerce API connection failed: ${testResponse.status} ${testResponse.statusText}`);
      }

      logStep('WooCommerce connection successful');

      // Sync categories first if enabled
      if (settings.sync_categories) {
        logStep('Starting category sync');
        const categoriesResponse = await fetch(
          `${settings.store_url}/wp-json/wc/v3/products/categories?per_page=100`,
          { headers: wcHeaders }
        );

        if (!categoriesResponse.ok) {
          logStep('Categories fetch failed', { status: categoriesResponse.status });
          throw new Error(`Categories API error: ${categoriesResponse.status}`);
        }

        const wcCategories: WooCommerceCategory[] = await categoriesResponse.json();
        logStep('Categories fetched', { count: wcCategories.length });
        
        for (const wcCategory of wcCategories) {
          try {
            stats.categories_processed++;
            
            // Check if category mapping exists
            const { data: existingMapping } = await supabase
              .from('woocommerce_category_mapping')
              .select('local_category_id')
              .eq('woocommerce_category_id', wcCategory.id)
              .single();

            if (!existingMapping) {
              // Create new category
              const { data: newCategory, error: categoryError } = await supabase
                .from('product_categories')
                .insert({
                  name: wcCategory.name,
                  description: wcCategory.description || '',
                  is_active: true
                })
                .select()
                .single();

              if (!categoryError && newCategory) {
                // Create mapping
                await supabase
                  .from('woocommerce_category_mapping')
                  .insert({
                    local_category_id: newCategory.id,
                    woocommerce_category_id: wcCategory.id,
                    woocommerce_slug: wcCategory.slug
                  });
              }
            }
          } catch (categoryError) {
            logStep('Category processing error', { categoryId: wcCategory.id, error: categoryError });
          }
        }
        logStep('Category sync completed', { processed: stats.categories_processed });
      }

      // Sync products
      logStep('Starting product sync');
      let page = 1;
      const perPage = 20; // Reduced for better performance
      let hasMore = true;

      while (hasMore) {
        logStep('Fetching products page', { page, perPage });
        
        const productsResponse = await fetch(
          `${settings.store_url}/wp-json/wc/v3/products?per_page=${perPage}&page=${page}`,
          { headers: wcHeaders }
        );

        if (!productsResponse.ok) {
          logStep('Products fetch failed', { status: productsResponse.status, page });
          throw new Error(`Products API error: ${productsResponse.status}`);
        }

        const wcProducts: WooCommerceProduct[] = await productsResponse.json();
        logStep('Products fetched', { count: wcProducts.length, page });
        
        if (wcProducts.length === 0) {
          hasMore = false;
          break;
        }

        for (const wcProduct of wcProducts) {
          try {
            stats.products_processed++;
            
            // Check if product mapping exists
            const { data: existingMapping } = await supabase
              .from('woocommerce_product_mapping')
              .select('*')
              .eq('woocommerce_product_id', wcProduct.id)
              .single();

            // Get category mapping if product has categories
            let categoryId = null;
            if (wcProduct.categories.length > 0) {
              const { data: categoryMapping } = await supabase
                .from('woocommerce_category_mapping')
                .select('local_category_id')
                .eq('woocommerce_category_id', wcProduct.categories[0].id)
                .single();
              
              if (categoryMapping) {
                categoryId = categoryMapping.local_category_id;
              }
            }

            // Process product images if sync_images is enabled
            let images: string[] = [];
            if (settings.sync_images && wcProduct.images.length > 0) {
              images = wcProduct.images.map(img => img.src);
            }

            const productData = {
              name: wcProduct.name,
              description: wcProduct.description || wcProduct.short_description || '',
              price: parseFloat(wcProduct.regular_price || wcProduct.price || '0'),
              stock_quantity: wcProduct.stock_quantity || 0,
              sku: wcProduct.sku || null,
              weight: wcProduct.weight ? parseFloat(wcProduct.weight) : null,
              category_id: categoryId,
              images,
              is_active: wcProduct.stock_status === 'instock',
              updated_at: new Date().toISOString()
            };

            if (existingMapping) {
              // Update existing product
              const { error: updateError } = await supabase
                .from('products')
                .update(productData)
                .eq('id', existingMapping.local_product_id);

              if (updateError) {
                stats.products_failed++;
                logStep('Failed to update product', { wcId: wcProduct.id, error: updateError });
              } else {
                stats.products_updated++;
                
                // Update mapping
                await supabase
                  .from('woocommerce_product_mapping')
                  .update({
                    last_synced_at: new Date().toISOString(),
                    last_wc_modified: wcProduct.date_modified,
                    sync_status: 'synced'
                  })
                  .eq('id', existingMapping.id);
              }
            } else {
              // Create new product
              const { data: newProduct, error: createError } = await supabase
                .from('products')
                .insert(productData)
                .select()
                .single();

              if (createError) {
                stats.products_failed++;
                logStep('Failed to create product', { wcId: wcProduct.id, error: createError });
              } else {
                stats.products_created++;
                
                // Create mapping
                await supabase
                  .from('woocommerce_product_mapping')
                  .insert({
                    local_product_id: newProduct.id,
                    woocommerce_product_id: wcProduct.id,
                    woocommerce_sku: wcProduct.sku,
                    last_synced_at: new Date().toISOString(),
                    last_wc_modified: wcProduct.date_modified,
                    sync_status: 'synced'
                  });
              }
            }
          } catch (productError: any) {
            stats.products_failed++;
            logStep('Error processing product', { wcId: wcProduct.id, error: productError.message });
          }
        }

        page++;
        
        // Limit to prevent infinite loops
        if (page > 50) {
          logStep('Page limit reached, stopping sync');
          break;
        }
      }

      // Update sync settings with last sync time
      await supabase
        .from('woocommerce_sync_settings')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', settingsId);

      // Update sync log with completion
      const syncStatus = stats.products_failed > 0 ? 'partial' : 'completed';
      await supabase
        .from('woocommerce_sync_logs')
        .update({
          status: syncStatus,
          completed_at: new Date().toISOString(),
          duration_seconds: Math.floor((Date.now() - new Date(syncLog.started_at).getTime()) / 1000),
          ...stats
        })
        .eq('id', syncLogId);

      logStep('Sync completed successfully', stats);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'WooCommerce sync completed successfully',
          stats
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

    } catch (syncError: any) {
      logStep('Sync error occurred', { error: syncError.message });
      
      // Update sync log with failure
      await supabase
        .from('woocommerce_sync_logs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_details: { message: syncError.message },
          ...stats
        })
        .eq('id', syncLogId);

      throw syncError;
    }

  } catch (error: any) {
    logStep('Function execution failed', { error: error.message });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'WooCommerce sync failed',
        details: 'Check function logs for more information'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
}

serve(handler)
