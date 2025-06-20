
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProductAttribute {
  id: string;
  name: string;
  display_name: string;
  attribute_type: 'select' | 'color' | 'size' | 'text' | 'number';
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
  values?: ProductAttributeValue[];
}

interface ProductAttributeValue {
  id: string;
  attribute_id: string;
  value: string;
  display_value: string;
  hex_color: string | null;
  sort_order: number;
  is_active: boolean;
}

export function useProductAttributes() {
  return useQuery({
    queryKey: ['product-attributes'],
    queryFn: async () => {
      console.log('Fetching product attributes...');
      
      const { data, error } = await supabase
        .from('product_attributes')
        .select(`
          *,
          values:product_attribute_values(*)
        `)
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.error('Error fetching product attributes:', error);
        throw error;
      }

      return data as ProductAttribute[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateProductAttribute() {
  return async (attribute: Omit<ProductAttribute, 'id'>) => {
    const { data, error } = await supabase
      .from('product_attributes')
      .insert(attribute)
      .select()
      .single();

    if (error) throw error;
    return data;
  };
}

export function useCreateAttributeValue() {
  return async (value: Omit<ProductAttributeValue, 'id'>) => {
    const { data, error } = await supabase
      .from('product_attribute_values')
      .insert(value)
      .select()
      .single();

    if (error) throw error;
    return data;
  };
}
