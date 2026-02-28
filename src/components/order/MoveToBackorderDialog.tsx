
import React, { useState } from "react";
import { PackageX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { moveItemsToBackorder } from "./services/backorderService";

interface MoveToBackorderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  products: any[];
  onBackorderCreated: () => void;
}

interface SelectedItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  maxQuantity: number;
  selected: boolean;
}

export function MoveToBackorderDialog({
  open,
  onOpenChange,
  orderId,
  products,
  onBackorderCreated,
}: MoveToBackorderDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialItems: SelectedItem[] = (Array.isArray(products) ? products : []).map((p: any) => ({
    productId: p.id || p.product_id || "",
    productName: p.name || p.product_name || "Item",
    quantity: Number(p.quantity || 1),
    unitPrice: Number(p.price || p.unit_price || 0),
    maxQuantity: Number(p.quantity || 1),
    selected: false,
  }));

  const [items, setItems] = useState<SelectedItem[]>(initialItems);

  // Reset when dialog opens
  React.useEffect(() => {
    if (open) {
      setItems(
        (Array.isArray(products) ? products : []).map((p: any) => ({
          productId: p.id || p.product_id || "",
          productName: p.name || p.product_name || "Item",
          quantity: Number(p.quantity || 1),
          unitPrice: Number(p.price || p.unit_price || 0),
          maxQuantity: Number(p.quantity || 1),
          selected: false,
        }))
      );
    }
  }, [open, products]);

  const toggleItem = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const updateQuantity = (index: number, value: string) => {
    const qty = parseFloat(value) || 0;
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, quantity: Math.min(Math.max(0, qty), item.maxQuantity) }
          : item
      )
    );
  };

  const selectedItems = items.filter((item) => item.selected && item.quantity > 0);

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please select at least one item to move to backorder");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await moveItemsToBackorder(
        orderId,
        selectedItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }))
      );

      toast.success(
        `${result.itemsMoved} item(s) moved to backorder ${result.backorderNumber}`
      );
      onOpenChange(false);
      onBackorderCreated();
    } catch (error: any) {
      toast.error(error.message || "Failed to create backorder");
    } finally {
      setIsSubmitting(false);
    }
  };

  const backorderTotal = selectedItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageX className="w-5 h-5 text-orange-600" />
            Move Items to Backorder
          </DialogTitle>
          <DialogDescription>
            Select items and quantities to move into a new backorder. These will
            be removed from the current order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {items.map((item, index) => (
            <div
              key={item.productId + index}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                item.selected
                  ? "border-orange-300 bg-orange-50"
                  : "border-border"
              }`}
            >
              <Checkbox
                checked={item.selected}
                onCheckedChange={() => toggleItem(index)}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {item.productName}
                </p>
                <p className="text-xs text-muted-foreground">
                  ${item.unitPrice.toFixed(2)} each · Max qty: {item.maxQuantity}
                </p>
              </div>
              {item.selected && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Qty:</Label>
                  <Input
                    type="number"
                    min={0.01}
                    max={item.maxQuantity}
                    step="any"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(index, e.target.value)}
                    className="w-20 h-8 text-sm"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {selectedItems.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
            <p className="font-medium text-orange-900">
              Backorder Summary: {selectedItems.length} item(s) · $
              {backorderTotal.toFixed(2)}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedItems.length === 0}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isSubmitting ? "Creating Backorder..." : "Move to Backorder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
