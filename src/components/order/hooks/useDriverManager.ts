
import { supabase } from "@/integrations/supabase/client";

export function useDriverManager(setDriverId: (id: string) => void, setDriverName: (name: string) => void) {
  const handleDriverChange = async (newDriverId: string) => {
    setDriverId(newDriverId);
    if (newDriverId) {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', newDriverId)
        .single();
      
      if (data) {
        setDriverName(data.full_name || data.email);
      }
    } else {
      setDriverName("");
    }
  };

  return { handleDriverChange };
}
