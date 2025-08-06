-- Enable RLS policies for suburb management

-- Allow admins to manage suburbs
CREATE POLICY "Admins can manage suburbs" 
ON public.suburbs 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

-- Create function for bulk suburb operations
CREATE OR REPLACE FUNCTION public.bulk_update_suburb_status(
  suburb_ids UUID[],
  new_status BOOLEAN
) 
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  UPDATE public.suburbs 
  SET 
    is_active = new_status,
    updated_at = now()
  WHERE id = ANY(suburb_ids);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$;