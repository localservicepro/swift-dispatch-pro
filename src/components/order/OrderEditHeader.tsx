
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface OrderEditHeaderProps {
  orderNumber: string;
}

export function OrderEditHeader({ orderNumber }: OrderEditHeaderProps) {
  return (
    <DialogHeader>
      <DialogTitle>Edit Order {orderNumber}</DialogTitle>
    </DialogHeader>
  );
}
