
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

const testWooCommerceConnection = async (storeUrl: string, consumerKey: string, consumerSecret: string) => {
  try {
    const wcAuth = btoa(`${consumerKey}:${consumerSecret}`);
    const response = await fetch(`${storeUrl}/wp-json/wc/v3/system_status`, {
      headers: {
        'Authorization': `Basic ${wcAuth}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`WooCommerce API connection failed: ${response.status} - ${response.statusText}`);
    }
    
    return { success: true, message: 'Connection successful' };
  } catch (error: any) {
    logStep('WooCommerce connection test failed', error);
    return { success: false, message: error.message };
  }
};

const validateSyncSettings = (settings: any) => {
  const errors: string[] = [];
  
  if (!settings.store_url) errors.push('Store URL is required');
  if (!settings.consumer_key) errors.push('Consumer Key is required');
  if (!settings.consumer_secret) errors.push('Consumer Secret is required');
  
  // Validate store URL format
  if (settings.store_url && !settings.store_url.match(/^https?:\/\/.+/)) {
    errors.push('Store URL must be a valid HTTP/HTTPS URL');
  }
  
  return errors;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    logStep('WC Sync function called', { method: req.method });

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

    // Add connection test action
    if (action === 'test-connection') {
      const { data: settings, error: settingsError } = await supabase
        .from('woocommerce_sync_settings')
        .select('store_url, consumer_key, consumer_secret')
        .eq('id', settingsId)
        .single();

      if (settingsError || !settings) {
        logStep('Settings not found for connection test', settingsError);
        throw new Error('WooCommerce settings not found');
      }

      const validationErrors = validateSyncSettings(settings);
      if (validationErrors.length > 0) {
        return new Response(
          JSON.stringify({ success: false, error: validationErrors.join(', ') }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const connectionResult = await testWooCommerceConnection(
        settings.store_url, 
        settings.consumer_key, 
        settings.consumer_secret
      );

      return new Response(
        JSON.stringify(connectionResult),
        { 
          status: connectionResult.success ? 200 : 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
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

    // Validate settings before proceeding
    const validationErrors = validateSyncSettings(settings);
    if (validationErrors.length > 0) {
      logStep('Settings validation failed', validationErrors);
      throw new Error(`Settings validation failed: ${validationErrors.join(', ')}`);
    }

    logStep('Settings retrieved', { storeUrl: settings.store_url });

    // Initialize WooCommerce API credentials
    const wcAuth = btoa(`${settings.consumer_key}:${settings.consumer_secret}`);
    const wcHeaders = {
      'Authorization': `Basic ${wcAuth}`,
      'Content-Type': 'application/json',
    };

    // Create sync log entry
    const syncStartTime = new Date().toISOString();
    const { data: syncLog, error: logError } = await supabase
      .from('woocommerce_sync_logs')
      .insert({
        settings_id: settingsId,
        sync_type: action === 'full-sync' ? 'full' : 'incremental',
        direction: settings.sync_direction,
        status: 'in_progress',
        started_at: syncStartTime,
        triggered_by: null // Could be enhanced to track who triggered the sync
      })
      .select()
      .single();

    if (logError) {
      logStep('Failed to create sync log', logError);
    }

    let productsProcessed = 0;
    let productsCreated = 0;
    let productsUpdated = 0;
    let productsFailed = 0;
    let categoriesProcessed = 0;

    try {
      // Sync categories first if enabled
      if (settings.sync_categories) {
        logStep('Starting category sync');
        await syncCategories(supabase, settings, wcHeaders);
        categoriesProcessed = await getCategoryCount(supabase);
      }

      // Sync products
      logStep('Starting product sync');
      const syncStats = await syncProducts(supabase, settings, wcHeaders, action === 'full-sync');
      
      productsProcessed = syncStats.processed;
      productsCreated = syncStats.created;
      productsUpdated = syncStats.updated;
      productsFailed = syncStats.failed;

      // Update sync log with success
      if (syncLog) {
        await supabase
          .from('woocommerce_sync_logs')
          .update({
            status: productsFailed > 0 ? 'partial' : 'completed',
            completed_at: new Date().toISOString(),
            products_processed: productsProcessed,
            products_created: productsCreated,
            products_updated: productsUpdated,
            products_failed: productsFailed,
            categories_processed: categoriesProcessed,
            duration_seconds: Math.floor((Date.now() - new Date(syncStartTime).getTime()) / 1000)
          })
          .eq('id', syncLog.id);
      }

      // Update settings last sync time
      await supabase
        .from('woocommerce_sync_settings')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', settingsId);

      logStep('Sync completed successfully', {
        productsProcessed,
        productsCreated,
        productsUpdated,
        productsFailed,
        categoriesProcessed
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'WooCommerce sync completed successfully',
          stats: {
            productsProcessed,
            productsCreated,
            productsUpdated,
            productsFailed,
            categoriesProcessed
          }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

    } catch (syncError: any) {
      logStep('Sync failed', syncError);

      // Update sync log with failure
      if (syncLog) {
        await supabase
          .from('woocommerce_sync_logs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_details: { message: syncError.message, stack: syncError.stack },
            products_processed: productsProcessed,
            products_created: productsCreated,
            products_updated: productsUpdated,
            products_failed: productsFailed,
            categories_processed: categoriesProcessed,
            duration_seconds: Math.floor((Date.now() - new Date(syncStartTime).getTime()) / 1000)
          })
          .eq('id', syncLog.id);
      }

      throw syncError;
    }

  } catch (error: any) {
    logStep('Function execution failed', { error: error.message });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'WC Sync failed'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
}

async function syncCategories(supabase: any, settings: any, wcHeaders: any) {
  try {
    logStep('Fetching WooCommerce categories');
    
    const categoriesResponse = await fetch(
      `${settings.store_url}/wp-json/wc/v3/products/categories?per_page=100`,
      { headers: wcHeaders }
    );

    if (!categoriesResponse.ok) {
      throw new Error(`Failed to fetch categories: ${categoriesResponse.status}`);
    }

    const wcCategories: WooCommerceCategory[] = await categoriesResponse.json();
    logStep(`Found ${wcCategories.length} categories to sync`);

    for (const wcCategory of wcCategories) {
      try {
        // Check if category mapping exists
        const { data: existingMapping } = await supabase
          .from('woocommerce_category_mapping')
          .select('local_category_id')
          .eq('woocommerce_category_id', wcCategory.id)
          .single();

        if (existingMapping) {
          // Update existing category
          await supabase
            .from('product_categories')
            .update({
              name: wcCategory.name,
              description: wcCategory.description
            })
            .eq('id', existingMapping.local_category_id);
        } else {
          // Create new category
          const { data: newCategory } = await supabase
            .from('product_categories')
            .insert({
              name: wcCategory.name,
              description: wcCategory.description,
              is_active: true
            })
            .select()
            .single();

          if (newCategory) {
            // Create mapping
            await supabase
              .from('woocommerce_category_mapping')
              .insert({
                woocommerce_category_id: wcCategory.id,
                local_category_id: newCategory.id,
                woocommerce_slug: wcCategory.slug
              });
          }
        }
      } catch (categoryError) {
        logStep(`Failed to sync category ${wcCategory.name}`, categoryError);
      }
    }
  } catch (error) {
    logStep('Category sync failed', error);
    throw error;
  }
}

async function syncProducts(supabase: any, settings: any, wcHeaders: any, isFullSync: boolean) {
  let processed = 0;
  let created = 0;
  let updated = 0;
  let failed = 0;
  let page = 1;
  const perPage = 20; // Reduced batch size for better reliability
  const maxRetries = 3;

  const retryWithBackoff = async (fn: () => Promise<any>, retries = maxRetries) => {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        logStep(`Retrying operation, ${retries} attempts left`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * (maxRetries - retries + 1)));
        return retryWithBackoff(fn, retries - 1);
      }
      throw error;
    }
  };

  try {
    while (true) {
      logStep(`Fetching products page ${page}`, { perPage, isFullSync });
      
      let url = `${settings.store_url}/wp-json/wc/v3/products?per_page=${perPage}&page=${page}&status=any`;
      
      // For incremental sync, only get modified products
      if (!isFullSync) {
        const lastSync = settings.last_sync_at;
        if (lastSync) {
          url += `&modified_after=${encodeURIComponent(lastSync)}`;
        }
      }

      const productsResponse = await retryWithBackoff(async () => {
        const response = await fetch(url, { 
          headers: wcHeaders,
          timeout: 30000 // 30 second timeout
        });
        
        if (!response.ok) {
          if (response.status === 429) {
            // Rate limited - wait longer
            await new Promise(resolve => setTimeout(resolve, 5000));
            throw new Error(`Rate limited: ${response.status}`);
          }
          throw new Error(`Failed to fetch products: ${response.status} - ${await response.text()}`);
        }
        
        return response;
      });

      const wcProducts: WooCommerceProduct[] = await productsResponse.json();
      
      if (wcProducts.length === 0) {
        logStep('No more products to sync');
        break;
      }

      logStep(`Processing ${wcProducts.length} products from page ${page}`);

      for (const wcProduct of wcProducts) {
        try {
          processed++;
          
          // Check if product mapping exists
          const { data: existingMapping } = await supabase
            .from('woocommerce_product_mapping')
            .select('local_product_id, last_wc_modified')
            .eq('woocommerce_product_id', wcProduct.id)
            .single();

          // Skip if not modified (for incremental sync)
          if (existingMapping && !isFullSync) {
            const lastModified = new Date(existingMapping.last_wc_modified);
            const wcModified = new Date(wcProduct.date_modified);
            if (wcModified <= lastModified) {
              continue;
            }
          }

          // Get category mapping
          let categoryId = null;
          if (wcProduct.categories.length > 0 && settings.sync_categories) {
            const { data: categoryMapping } = await supabase
              .from('woocommerce_category_mapping')
              .select('local_category_id')
              .eq('woocommerce_category_id', wcProduct.categories[0].id)
              .single();
            
            categoryId = categoryMapping?.local_category_id;
          }

          // Validate and prepare product data
          const productData = {
            name: wcProduct.name?.trim() || `Product ${wcProduct.id}`,
            description: wcProduct.description || '',
            sku: wcProduct.sku?.trim() || null,
            price: Math.max(0, parseFloat(wcProduct.regular_price || wcProduct.price) || 0),
            stock_quantity: Math.max(0, wcProduct.stock_quantity || 0),
            weight: wcProduct.weight ? Math.max(0, parseFloat(wcProduct.weight)) : null,
            category_id: categoryId,
            is_active: wcProduct.status === 'publish' && wcProduct.stock_status === 'instock',
            images: settings.sync_images ? wcProduct.images.map(img => img.src).filter(Boolean) : [],
            product_type: 'single'
          };

          // Validate required fields
          if (!productData.name) {
            logStep(`Skipping product ${wcProduct.id} - missing name`);
            failed++;
            continue;
          }

          if (existingMapping) {
            // Update existing product
            await supabase
              .from('products')
              .update(productData)
              .eq('id', existingMapping.local_product_id);

            // Update mapping
            await supabase
              .from('woocommerce_product_mapping')
              .update({
                last_wc_modified: wcProduct.date_modified,
                last_synced_at: new Date().toISOString(),
                sync_status: 'synced',
                woocommerce_sku: wcProduct.sku
              })
              .eq('woocommerce_product_id', wcProduct.id);

            updated++;
          } else {
            // Create new product
            const { data: newProduct } = await supabase
              .from('products')
              .insert(productData)
              .select()
              .single();

            if (newProduct) {
              // Create mapping
              await supabase
                .from('woocommerce_product_mapping')
                .insert({
                  woocommerce_product_id: wcProduct.id,
                  local_product_id: newProduct.id,
                  last_wc_modified: wcProduct.date_modified,
                  last_synced_at: new Date().toISOString(),
                  sync_status: 'synced',
                  woocommerce_sku: wcProduct.sku
                });

              created++;
            }
          }

        } catch (productError: any) {
          logStep(`Failed to sync product ${wcProduct.name}`, productError);
          failed++;
          
          // Update mapping with error status if it exists, or create new mapping with error
          const existingMapping = await supabase
            .from('woocommerce_product_mapping')
            .select('id')
            .eq('woocommerce_product_id', wcProduct.id)
            .single();

          const errorDetails = {
            message: productError.message,
            timestamp: new Date().toISOString(),
            product_id: wcProduct.id,
            product_name: wcProduct.name
          };

          if (existingMapping.data) {
            await supabase
              .from('woocommerce_product_mapping')
              .update({
                sync_status: 'failed',
                sync_errors: [errorDetails],
                updated_at: new Date().toISOString()
              })
              .eq('woocommerce_product_id', wcProduct.id);
          }
        }
      }

      page++;
    }

    return { processed, created, updated, failed };

  } catch (error) {
    logStep('Product sync failed', error);
    throw error;
  }
}

async function getCategoryCount(supabase: any): Promise<number> {
  const { count } = await supabase
    .from('woocommerce_category_mapping')
    .select('*', { count: 'exact', head: true });
  
  return count || 0;
}

serve(handler)
