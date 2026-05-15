import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProductOption {
  id: string;
  name: string;
  sku: string | null;
}

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}

export function ProductMultiSelect({ value, onChange, placeholder = "Select products..." }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["all-active-products-for-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as ProductOption[];
    },
    staleTime: 1000 * 60 * 10,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q),
    );
  }, [products, search]);

  const selectedProducts = useMemo(
    () => products.filter((p) => value.includes(p.id)),
    [products, value],
  );

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value.length === 0 ? placeholder : `${value.length} product${value.length > 1 ? "s" : ""} selected`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[420px] p-0 pointer-events-auto" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground text-center">No products found.</div>
            )}
            {filtered.map((p) => {
              const selected = value.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
                    selected && "bg-muted/50",
                  )}
                >
                  <Check className={cn("h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.sku && <span className="text-xs text-muted-foreground">{p.sku}</span>}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedProducts.map((p) => (
            <Badge key={p.id} variant="secondary" className="gap-1">
              {p.name}
              <button
                type="button"
                onClick={() => toggle(p.id)}
                className="hover:text-destructive"
                aria-label={`Remove ${p.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
