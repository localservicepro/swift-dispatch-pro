
-- Create enum for attribute types
CREATE TYPE public.attribute_type AS ENUM ('select', 'color', 'size', 'text', 'number');

-- Create product attributes table (defines what attributes exist like "Size", "Color")
CREATE TABLE public.product_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    attribute_type attribute_type NOT NULL DEFAULT 'select',
    is_required BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product attribute values table (specific values like "Small", "Red")
CREATE TABLE public.product_attribute_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attribute_id UUID NOT NULL REFERENCES public.product_attributes(id) ON DELETE CASCADE,
    value TEXT NOT NULL,
    display_value TEXT NOT NULL,
    hex_color TEXT, -- For color attributes
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(attribute_id, value)
);

-- Create product variants table (combinations of attribute values for each product)
CREATE TABLE public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku TEXT UNIQUE,
    variant_name TEXT, -- e.g., "Red Large T-Shirt"
    price_adjustment NUMERIC(10,2) NOT NULL DEFAULT 0, -- Additional cost for this variant
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    weight_adjustment NUMERIC(8,2) DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for variant attribute values
CREATE TABLE public.product_variant_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    attribute_id UUID NOT NULL REFERENCES public.product_attributes(id) ON DELETE CASCADE,
    attribute_value_id UUID NOT NULL REFERENCES public.product_attribute_values(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(variant_id, attribute_id)
);

-- Create pricing tiers table
CREATE TABLE public.pricing_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    discount_percentage NUMERIC(5,2) DEFAULT 0, -- e.g., 10.00 for 10% discount
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customer pricing tier assignments
CREATE TABLE public.customer_pricing_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    pricing_tier_id UUID NOT NULL REFERENCES public.pricing_tiers(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    assigned_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(customer_id, pricing_tier_id)
);

-- Create product pricing table for tier-specific pricing
CREATE TABLE public.product_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    pricing_tier_id UUID NOT NULL REFERENCES public.pricing_tiers(id) ON DELETE CASCADE,
    price NUMERIC(10,2) NOT NULL,
    min_quantity INTEGER DEFAULT 1,
    max_quantity INTEGER,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_to TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    -- Ensure either product_id or variant_id is set, but not both
    CONSTRAINT check_product_or_variant CHECK (
        (product_id IS NOT NULL AND variant_id IS NULL) OR 
        (product_id IS NULL AND variant_id IS NOT NULL)
    )
);

-- Insert default pricing tier
INSERT INTO public.pricing_tiers (name, display_name, description, is_default, is_active) 
VALUES ('retail', 'Retail', 'Standard retail pricing for all customers', true, true);

-- Create indexes for better performance
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX idx_product_variant_attributes_variant_id ON public.product_variant_attributes(variant_id);
CREATE INDEX idx_product_pricing_product_id ON public.product_pricing(product_id);
CREATE INDEX idx_product_pricing_variant_id ON public.product_pricing(variant_id);
CREATE INDEX idx_product_pricing_tier_id ON public.product_pricing(pricing_tier_id);
CREATE INDEX idx_customer_pricing_tiers_customer_id ON public.customer_pricing_tiers(customer_id);

-- Enable RLS on all new tables
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variant_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_pricing ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all operations for now - can be restricted later)
CREATE POLICY "Allow all operations" ON public.product_attributes FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.product_attribute_values FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.product_variants FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.product_variant_attributes FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.pricing_tiers FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.customer_pricing_tiers FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON public.product_pricing FOR ALL USING (true);
