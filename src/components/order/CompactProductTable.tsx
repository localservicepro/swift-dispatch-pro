
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Edit3, Trash2 } from "lucide-react";
import { CartItem, SplitConfig } from "./types";
import { useToast } from "@/hooks/use-toast";
import { getQuantityIncrement, getQuantityInputStep, getMinimumQuantity, validateQuantity, roundToValidQuantity, getQuantityErrorMessage } from "@/utils/categoryUtils";

interface CompactProductTableProps {
  cart: CartItem[];
  splits: SplitConfig[];
  onQuantityChange?: (productId: string, newQuantity: number) => void;
  onRemoveFromCart?: (productId: string) => void;
  onUpdateSplitQuantity?: (splitIndex: number, productId: string, quantity: number) => void;
}

export function CompactProductTable({ 
  cart, 
  splits, 
  onQuantityChange,
  onRemoveFromCart,
  onUpdateSplitQuantity
}: CompactProductTableProps) {
  const { toast } = useToast();
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [editingSplitQuantity, setEditingSplitQuantity] = useState<string | null>(null);
  const [splitInputValue, setSplitInputValue] = useState("");

  const parseQuantityInput = (input: string): number => {
    // Handle fractional input like "1 1/4" or "1.25"
    const fractionMatch = input.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (fractionMatch) {
      const whole = parseInt(fractionMatch[1]);
      const numerator = parseInt(fractionMatch[2]);
      const denominator = parseInt(fractionMatch[3]);
      return whole + (numerator / denominator);
    }
    
    // Handle simple fraction like "1/4"
    const simpleFractionMatch = input.match(/^(\d+)\/(\d+)$/);
    if (simpleFractionMatch) {
      const numerator = parseInt(simpleFractionMatch[1]);
      const denominator = parseInt(simpleFractionMatch[2]);
      return numerator / denominator;
    }
    
    // Handle decimal input
    const decimal = parseFloat(input);
    return isNaN(decimal) ? 0 : decimal;
  };

  const formatQuantity = (quantity: number): string => {
    // Format to show up to 3 decimal places, removing trailing zeros
    return quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(3).replace(/\.?0+$/, '');
  };

  const getTotalAllocated = (productId: string) => {
    return splits.reduce((total, split) => {
      const splitProduct = split.products.find(p => p.productId === productId);
      return total + (splitProduct?.quantity || 0);
    }, 0);
  };

  const handleQuantityEdit = (productId: string, currentQuantity: number) => {
    setEditingQuantity(productId);
    setInputValue(formatQuantity(currentQuantity));
  };

  const handleQuantitySubmit = (productId: string) => {
    const newQuantity = parseQuantityInput(inputValue);
    const totalAllocated = getTotalAllocated(productId);
    
    if (isNaN(newQuantity) || newQuantity < 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a valid quantity (minimum 0)",
        variant: "destructive",
      });
      return;
    }

    if (newQuantity < totalAllocated) {
      toast({
        title: "Cannot reduce quantity",
        description: "Cannot reduce below allocated quantity",
        variant: "destructive",
      });
      return;
    }

    // Set minimum quantity to 0.25 if user enters 0
    const cartItem = cart.find(item => item.product.id === productId);
    if (!cartItem) return;
    
    const minQuantity = getMinimumQuantity(cartItem.product);
    
    if (!validateQuantity(newQuantity, cartItem.product)) {
      toast({
        title: "Invalid quantity",
        description: getQuantityErrorMessage(cartItem.product),
        variant: "destructive",
      });
      return;
    }

    const finalQuantity = newQuantity === 0 ? minQuantity : newQuantity;
    onQuantityChange?.(productId, finalQuantity);
    setEditingQuantity(null);
    setInputValue("");
  };

  const handleQuantityCancel = () => {
    setEditingQuantity(null);
    setInputValue("");
  };

  const handleSplitQuantityChange = (splitIndex: number, productId: string, direction: 'increase' | 'decrease') => {
    const cartItem = cart.find(item => item.product.id === productId);
    if (!cartItem) return;
    
    const increment = 1; // Always use whole number increments for buttons
    const change = direction === 'increase' ? increment : -increment;
    
    const split = splits[splitIndex];
    const splitProduct = split.products.find(p => p.productId === productId);
    const currentQuantity = splitProduct?.quantity || 0;
    const rawNewQuantity = Math.max(0, currentQuantity + change);
    const newQuantity = roundToValidQuantity(rawNewQuantity, cartItem.product);
    
    const totalAllocated = getTotalAllocated(productId);
    const remainingQuantity = (cartItem?.quantity || 0) - totalAllocated + currentQuantity;
    
    if (change > 0 && remainingQuantity <= 0) {
      toast({
        title: "Cannot allocate more",
        description: "No remaining quantity to allocate",
        variant: "destructive",
      });
      return;
    }

    onUpdateSplitQuantity?.(splitIndex, productId, newQuantity);
  };

  const handleSplitQuantityEdit = (splitIndex: number, productId: string, currentQuantity: number) => {
    const editKey = `${splitIndex}-${productId}`;
    setEditingSplitQuantity(editKey);
    setSplitInputValue(formatQuantity(currentQuantity));
  };

  const handleSplitQuantitySubmit = (splitIndex: number, productId: string) => {
    const newQuantity = parseQuantityInput(splitInputValue);
    const cartItem = cart.find(item => item.product.id === productId);
    if (!cartItem) return;

    if (isNaN(newQuantity) || newQuantity < 0) {
      toast({
        title: "Invalid quantity",
        description: "Please enter a valid quantity (minimum 0)",
        variant: "destructive",
      });
      return;
    }

    const split = splits[splitIndex];
    const splitProduct = split.products.find(p => p.productId === productId);
    const currentQuantity = splitProduct?.quantity || 0;
    const totalAllocated = getTotalAllocated(productId);
    const remainingQuantity = cartItem.quantity - totalAllocated + currentQuantity;

    if (newQuantity > remainingQuantity) {
      toast({
        title: "Cannot allocate more",
        description: `Only ${formatQuantity(remainingQuantity)} remaining to allocate`,
        variant: "destructive",
      });
      return;
    }

    const roundedQuantity = roundToValidQuantity(newQuantity, cartItem.product);
    onUpdateSplitQuantity?.(splitIndex, productId, roundedQuantity);
    setEditingSplitQuantity(null);
    setSplitInputValue("");
  };

  const handleSplitQuantityCancel = () => {
    setEditingSplitQuantity(null);
    setSplitInputValue("");
  };

  const handleDeleteProduct = (productId: string) => {
    const totalAllocated = getTotalAllocated(productId);
    if (totalAllocated > 0) {
      toast({
        title: "Cannot delete product",
        description: "Remove all allocations first",
        variant: "destructive",
      });
      return;
    }
    onRemoveFromCart?.(productId);
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-[250px] text-xs font-medium">Product</TableHead>
            <TableHead className="w-[80px] text-xs font-medium text-center">Qty</TableHead>
            {splits.map((split, index) => (
              <TableHead key={split.id} className="w-[90px] text-xs font-medium text-center">
                {split.name}
              </TableHead>
            ))}
            <TableHead className="w-[100px] text-xs font-medium text-center">Status</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cart.map(cartItem => {
            const totalAllocated = getTotalAllocated(cartItem.product.id);
            const remainingQuantity = cartItem.quantity - totalAllocated;
            const isFullyAllocated = remainingQuantity === 0;
            
            return (
              <TableRow key={cartItem.product.id} className="hover:bg-gray-50">
                <TableCell className="py-2">
                  <div>
                    <div className="font-medium text-sm">{cartItem.product.name}</div>
                    <div className="text-xs text-gray-500">${cartItem.unit_price.toFixed(2)} each</div>
                  </div>
                </TableCell>
                
                <TableCell className="py-2 text-center">
                  {editingQuantity === cartItem.product.id ? (
                    <div className="flex items-center gap-1">
                       <Input
                         type="number"
                         value={inputValue}
                         onChange={(e) => setInputValue(e.target.value)}
                         className="h-6 w-16 text-xs text-center"
                         onKeyDown={(e) => {
                           if (e.key === 'Enter') handleQuantitySubmit(cartItem.product.id);
                           if (e.key === 'Escape') handleQuantityCancel();
                         }}
                         onBlur={() => handleQuantitySubmit(cartItem.product.id)}
                         placeholder="1.25"
                          step={getQuantityInputStep(cartItem.product)}
                          min="0.001"
                         autoFocus
                       />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuantitySubmit(cartItem.product.id)}
                        className="h-5 w-5 p-0 text-green-600"
                      >
                        ✓
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1">
                      <span 
                        className="text-sm font-medium cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                        onClick={() => handleQuantityEdit(cartItem.product.id, cartItem.quantity)}
                      >
                        {formatQuantity(cartItem.quantity)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleQuantityEdit(cartItem.product.id, cartItem.quantity)}
                        className="h-4 w-4 p-0 opacity-60 hover:opacity-100"
                      >
                        <Edit3 className="w-2 h-2" />
                      </Button>
                    </div>
                  )}
                </TableCell>

                {splits.map((split, splitIndex) => {
                  const splitProduct = split.products.find(p => p.productId === cartItem.product.id);
                  const splitQuantity = splitProduct?.quantity || 0;
                  const editKey = `${splitIndex}-${cartItem.product.id}`;
                  const isEditing = editingSplitQuantity === editKey;
                  
                  return (
                    <TableCell key={split.id} className="py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSplitQuantityChange(splitIndex, cartItem.product.id, 'decrease')}
                          disabled={splitQuantity <= 0}
                          className="h-5 w-5 p-0"
                        >
                          <Minus className="w-2 h-2" />
                        </Button>
                        
                        {isEditing ? (
                          <Input
                            type="number"
                            value={splitInputValue}
                            onChange={(e) => setSplitInputValue(e.target.value)}
                            className="h-6 w-14 text-xs text-center px-1"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSplitQuantitySubmit(splitIndex, cartItem.product.id);
                              if (e.key === 'Escape') handleSplitQuantityCancel();
                            }}
                            onBlur={() => handleSplitQuantitySubmit(splitIndex, cartItem.product.id)}
                            placeholder="0.25"
                            step="0.001"
                            min="0"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="text-xs font-medium w-8 text-center cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded"
                            onClick={() => handleSplitQuantityEdit(splitIndex, cartItem.product.id, splitQuantity)}
                            title="Click to edit"
                          >
                            {formatQuantity(splitQuantity)}
                          </span>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSplitQuantityChange(splitIndex, cartItem.product.id, 'increase')}
                          disabled={remainingQuantity <= 0}
                          className="h-5 w-5 p-0"
                        >
                          <Plus className="w-2 h-2" />
                        </Button>
                      </div>
                    </TableCell>
                  );
                })}

                <TableCell className="py-2 text-center">
                  <Badge 
                    variant={isFullyAllocated ? "default" : remainingQuantity > 0 ? "secondary" : "destructive"}
                    className="text-xs"
                  >
                    {formatQuantity(totalAllocated)}/{formatQuantity(cartItem.quantity)}
                  </Badge>
                </TableCell>

                <TableCell className="py-2 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteProduct(cartItem.product.id)}
                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
