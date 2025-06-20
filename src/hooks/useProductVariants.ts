
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProductVariant {
  id: string;
  product_id: string;
  sku: string | null;
  variant_name: string | null;
  price_adjustment: number;
  stock_quantity: number;
  weight_adjustment: number | null;
  is_active: boolean;
  attributes?: VariantAttribute[];
}

interface VariantAttribute {
  id: string;
  variant_id: string;
  attribute_id: string;
  attribute_value_id: string;
  attribute: {
    name: string;
    display_name: string;
  };
  attribute_value: {
    value: string;
    display_value: string;
    hex_color: string | null;
  };
}

export function useProductVariants(productId: string) {
  return useQuery({
    queryKey: ['product-variants', productId],
    queryFn: async () => {
      console.log('Fetching product variants for:', productId);
      
      const { data, error } = await supabase
        .from('product_variants')
        .select(`
          *,
          attributes:product_variant_attributes(
            *,
            attribute:product_attributes(name, display_name),
            attribute_value:product_attribute_values(value, display_value, hex_color)
          )
        `)
        .eq('product_id', productId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching product variants:', error);
        throw error;
      }

      return data as ProductVariant[];
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateProductVariant() {
  return async (variant: Omit<ProductVariant, 'id' | 'attributes'>, attributeValues: string[]) => {
    const { data: variantData, error: variantError } = await supabase
      .from('product_variants')
      .insert(variant)
      .select()
      .single();

    if (variantError) throw variantError;

    // Create variant attribute associations
    if (attributeValues.length > 0) {
      const variantAttributes = attributeValues.map(valueId => ({
        variant_id: variantData.id,
        attribute_value_id: valueId,
        attribute_id: '', // This would need to be determined from the value
      }));

      const { error: attributeError } = await supabase
        .from('product_variant_attributes')
        .insert(variantAttributes);

      if (attributeError) throw attributeError;
    }

    return variantData;
  };
}
