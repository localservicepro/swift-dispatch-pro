import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OrderEditSections } from "./OrderEditSections";
import { OrderEditConflictSection } from "./OrderEditConflictSection";
import { useOrderEditFormLogic } from "./OrderEditFormLogic";
import { useOrderFormSubmission } from "./OrderEditFormSubmission";
import { Order } from "./OrderEditFormTypes";

type SubmissionGetter = () => any;

interface PanelProps {
  order: Order;
  productsReadOnly?: boolean;
  onRegister: (orderId: string, getter: SubmissionGetter) => void;
  onDirtyChange: (orderId: string, dirty: boolean) => void;
}

/**
 * One editable order form inside a tab. Each panel owns its own form state via
 * useOrderEditFormLogic and exposes its submission payload to the parent so a
 * single Save can write every changed order in the split group.
 */
function SplitEditTabPanel({ order, productsReadOnly, onRegister, onDirtyChange }: PanelProps) {
  const {
    formData,
    deliveryRate,
    driverConflict,
    truckConflict,
    isChecking,
    handleInputChange,
    handleDriverChange,
    handleSuburbChange,
    handleProductsChange,
    handleSubtotalChange,
    handleContactChange,
    handleFormDataChange,
    getFormDataForSubmission,
    calculationBreakdown,
    paymentSettings,
    missingFuelSurchargeAmount,
    applyMissingFuelSurcharge,
  } = useOrderEditFormLogic(order);

  const baselineRef = useRef<string | null>(null);

  useEffect(() => {
    onRegister(order.id, getFormDataForSubmission);
  }, [order.id, getFormDataForSubmission, onRegister]);

  useEffect(() => {
    const snapshot = JSON.stringify(formData);
    if (baselineRef.current === null) {
      baselineRef.current = snapshot;
      return;
    }
    onDirtyChange(order.id, snapshot !== baselineRef.current);
  }, [formData, order.id, onDirtyChange]);

  const businessInfo = {
    company_name: (order as any).company_name,
    business_name: (order as any).business_name,
    customer_type: (order as any).customer_type,
  };

  return (
    <div className="space-y-6">
      <OrderEditSections
        formData={formData}
        deliveryRate={deliveryRate}
        orderId={order.id}
        customerId={order.customer_id}
        businessInfo={businessInfo}
        onInputChange={handleInputChange}
        onDriverChange={handleDriverChange}
        onSuburbChange={handleSuburbChange}
        onProductsChange={handleProductsChange}
        onSubtotalChange={handleSubtotalChange}
        onContactChange={handleContactChange}
        onFormDataChange={handleFormDataChange}
        calculationBreakdown={calculationBreakdown}
        paymentSettings={paymentSettings}
        missingFuelSurchargeAmount={missingFuelSurchargeAmount}
        applyMissingFuelSurcharge={applyMissingFuelSurcharge}
        productsReadOnly={productsReadOnly}
      />

      <OrderEditConflictSection
        deliveryDate={formData.delivery_date}
        deliveryTime={formData.delivery_time}
        driverConflict={driverConflict}
        truckConflict={truckConflict}
        isChecking={isChecking}
      />
    </div>
  );
}

interface SplitOrderEditTabsProps {
  masterOrder: Order;
  splits: Order[];
  onOrderUpdated: () => void;
  onClose: () => void;
}

export function SplitOrderEditTabs({ masterOrder, splits, onOrderUpdated, onClose }: SplitOrderEditTabsProps) {
  const { toast } = useToast();
  const { handleOrderSubmission } = useOrderFormSubmission();
  const [activeTab, setActiveTab] = useState("master");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});
  const gettersRef = useRef<Record<string, SubmissionGetter>>({});

  const allOrders = useMemo(() => [masterOrder, ...splits], [masterOrder, splits]);

  const register = useCallback((orderId: string, getter: SubmissionGetter) => {
    gettersRef.current[orderId] = getter;
  }, []);

  const handleDirtyChange = useCallback((orderId: string, dirty: boolean) => {
    setDirtyMap(prev => (prev[orderId] === dirty ? prev : { ...prev, [orderId]: dirty }));
  }, []);

  const dirtyOrders = allOrders.filter(o => dirtyMap[o.id]);

  const labelFor = (order: Order) =>
    order.id === masterOrder.id
      ? "Master"
      : `Split ${(order as any).split_number ?? ""}`.trim();

  const recomputeMasterFromSplits = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("subtotal, adjustments, delivery_fee, fuel_surcharge, total_amount")
      .eq("master_order_id", masterOrder.id)
      .is("deleted_at", null);

    if (error || !data || data.length === 0) return;

    const sum = (key: string) => data.reduce((acc, row: any) => acc + (Number(row[key]) || 0), 0);

    await supabase
      .from("orders")
      .update({
        subtotal: sum("subtotal"),
        adjustments: sum("adjustments"),
        delivery_fee: sum("delivery_fee"),
        fuel_surcharge: sum("fuel_surcharge"),
        total_amount: sum("total_amount"),
        updated_at: new Date().toISOString(),
      })
      .eq("id", masterOrder.id);
  };

  const saveAll = async () => {
    setIsSaving(true);
    const noop = () => {};
    try {
      // Splits first, then the master, so the master's derived totals are
      // rebuilt from freshly saved split values.
      const ordered = [...splits, masterOrder];
      for (const order of ordered) {
        if (!dirtyMap[order.id]) continue;
        const getter = gettersRef.current[order.id];
        if (!getter) continue;
        await handleOrderSubmission(order, getter(), noop, noop, { silent: true });
      }

      await recomputeMasterFromSplits();

      toast({
        title: "Split order updated",
        description: `Saved ${dirtyOrders.length} order${dirtyOrders.length === 1 ? "" : "s"}. Master totals rebuilt from splits.`,
      });

      onOrderUpdated();
      setTimeout(() => onClose(), 150);
    } catch (error) {
      console.error("Failed to save split group:", error);
      toast({
        title: "Error",
        description: "Some changes could not be saved. Please review and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto">
          {allOrders.map(order => (
            <TabsTrigger key={order.id} value={order.id === masterOrder.id ? "master" : order.id} className="gap-2">
              {labelFor(order)}
              {dirtyMap[order.id] && <span className="h-2 w-2 rounded-full bg-amber-500" />}
            </TabsTrigger>
          ))}
        </TabsList>

        {allOrders.map(order => {
          const value = order.id === masterOrder.id ? "master" : order.id;
          return (
            <TabsContent key={order.id} value={value} forceMount hidden={activeTab !== value} className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline">{order.order_number}</Badge>
                {order.id === masterOrder.id && (
                  <span className="text-xs text-muted-foreground">
                    Master record — amounts are rebuilt from the splits on save.
                  </span>
                )}
              </div>
              <SplitEditTabPanel
                order={order}
                productsReadOnly={order.id === masterOrder.id}
                onRegister={register}
                onDirtyChange={handleDirtyChange}
              />
            </TabsContent>
          );
        })}
      </Tabs>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={isSaving || dirtyOrders.length === 0}
          onClick={() => setConfirmOpen(true)}
        >
          {isSaving ? "Saving..." : `Save changes${dirtyOrders.length ? ` (${dirtyOrders.length})` : ""}`}
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save split order changes?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>These orders will be updated:</p>
                <ul className="list-disc pl-5">
                  {dirtyOrders.map(o => (
                    <li key={o.id}>
                      {labelFor(o)} — {o.order_number}
                    </li>
                  ))}
                </ul>
                <p>The master order totals will be rebuilt as the sum of all splits.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                saveAll();
              }}
            >
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
