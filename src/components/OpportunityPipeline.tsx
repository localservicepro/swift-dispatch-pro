import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Filter, X, BarChart3 } from "lucide-react";
import { DroppablePipelineColumn } from "./opportunity/DroppablePipelineColumn";
import { useOpportunityData } from "./opportunity/useOpportunityData";
import { useOpportunitySearchData } from "./opportunity/useOpportunitySearchData";
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { OpportunityCard } from "./opportunity/OpportunityCard";
import { useAuth } from "./auth/AuthProvider";
import { updateOrderStatus as updateOrderStatusService } from '@/utils/orderStatusService';
import { activityLogger } from "@/utils/activityLogger";
import { OrderEditDialog } from "./order/OrderEditDialog";
import { TruckDriverAssignmentDialog } from "./order/TruckDriverAssignmentDialog";
import { Database } from "@/integrations/supabase/types";
import { OpportunityCardColorLegend } from "./opportunity/OpportunityCardColorLegend";
import { isPhoneNumber, phoneSearchMatch } from "@/utils/phoneUtils";

type TruckType = Database["public"]["Enums"]["truck_type"];

const PIPELINE_STAGES = [{
  id: 'on_hold',
  title: 'On Hold',
  color: 'bg-yellow-100 border-yellow-300',
  textColor: 'text-yellow-700'
}, {
  id: 'requested',
  title: 'Order Requested',
  color: 'bg-slate-100 border-slate-300',
  textColor: 'text-slate-700'
}, {
  id: 'preparing',
  title: 'Confirmed & Preparing',
  color: 'bg-blue-100 border-blue-300',
  textColor: 'text-blue-700'
}, {
  id: 'loading',
  title: 'Loading',
  color: 'bg-orange-100 border-orange-300',
  textColor: 'text-orange-700'
}, {
  id: 'en_route',
  title: 'En Route',
  color: 'bg-purple-100 border-purple-300',
  textColor: 'text-purple-700'
}, {
  id: 'delivered',
  title: 'Delivered',
  color: 'bg-green-100 border-green-300',
  textColor: 'text-green-700'
}];

export function OpportunityPipeline() {
  const [searchQuery, setSearchQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedOrder, setDraggedOrder] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // New state for truck/driver assignment
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [orderForAssignment, setOrderForAssignment] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  // Refs for scroll synchronization
  const topScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const {
    orders: pipelineOrders,
    isLoading,
    error,
    refetch,
    invalidateOrdersCache,
    patchOrderInCache,
    markRecentlyMutated
  } = useOpportunityData(dateFilter as any);

  // When the user types a search, also pull matching orders from across the
  // entire history so historical / older delivered orders can be surfaced.
  const {
    data: searchOrders = [],
    isFetching: isSearching,
  } = useOpportunitySearchData(searchQuery);

  // Merge pipeline + search results, preferring the realtime-tracked pipeline copy.
  const orders = useMemo(() => {
    if (!searchQuery.trim() || searchOrders.length === 0) return pipelineOrders;
    const byId = new Map<string, any>();
    for (const o of searchOrders) byId.set(o.id, o);
    for (const o of pipelineOrders) byId.set(o.id, o); // pipeline copy wins
    return Array.from(byId.values());
  }, [pipelineOrders, searchOrders, searchQuery]);

  // Always refetch when this view mounts so freshly created orders appear immediately.
  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Configure drag sensors
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8
    }
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 8
    }
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  // Filter orders based on search and filters
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      
      // Check if search term is a phone number
      const isPhoneSearch = isPhoneNumber(searchQuery);
      
      filtered = filtered.filter(order => {
        if (isPhoneSearch) {
          // Enhanced phone number search
          return phoneSearchMatch(order.customer_phone, searchQuery) ||
                 phoneSearchMatch(order.contact_phone, searchQuery);
        } else {
          // Regular text search
          return order.order_number.toLowerCase().includes(query) || 
                 order.customer_name.toLowerCase().includes(query) ||
                 (order.purchase_order && order.purchase_order.toLowerCase().includes(query)) ||
                 (order.company_name && order.company_name.toLowerCase().includes(query)) ||
                 (order.business_name && order.business_name.toLowerCase().includes(query));
        }
      });
    }

    // Date filtering is now handled server-side in useOpportunityData via dateFilter.
    return filtered;
  }, [orders, searchQuery]);

  // Group orders by pipeline stage with payment-priority logic
  const ordersByStage = useMemo(() => {
    const grouped = PIPELINE_STAGES.reduce((acc, stage) => {
      acc[stage.id] = [];
      return acc;
    }, {} as Record<string, any[]>);

    filteredOrders.forEach(order => {
      let stage = 'requested';
      const customerType = order.customers?.customer_type || order.customer_type;
      // Diagnostic: surface any order we can't categorise so it isn't silently dropped.
      if (!order.status) {
        console.warn('[Pipeline] Order missing status, defaulting to requested:', order.order_number, order.id);
      }

      // Check for "On Hold" conditions first - only back_order status
      if (order.status === 'back_order') {
        stage = 'on_hold';
      } else if (customerType === 'account') {
        // Account customers can progress through stages even with pending payment
        if (order.status === 'requested') {
          stage = 'requested';
        } else if (order.status === 'preparing') {
          stage = 'preparing';
        } else if (order.status === 'loading') {
          stage = 'loading';
        } else if (order.status === 'en_route') {
          stage = 'en_route';
        } else if (order.status === 'delivered') {
          stage = 'delivered';
        }
      } else {
        // Trade/residential customers need payment before progressing
        if (order.payment_status === 'pending') {
          stage = 'requested';
        } else if (order.payment_status === 'paid') {
          // Only paid orders can progress beyond requested stage
          if (order.status === 'requested') {
            stage = 'requested';
          } else if (order.status === 'preparing') {
            stage = 'preparing';
          } else if (order.status === 'loading') {
            stage = 'loading';
          } else if (order.status === 'en_route') {
            stage = 'en_route';
          } else if (order.status === 'delivered') {
            stage = 'delivered';
          }
        }
      }

      grouped[stage].push(order);
    });

    return grouped;
  }, [filteredOrders]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setCustomerFilter("all");
    setDateFilter("all");
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery.trim() !== "" || customerFilter !== "all" || dateFilter !== "all";

  // Calculate pipeline metrics
  const totalOrders = filteredOrders.length;
  const totalValue = filteredOrders.reduce((sum, order) => sum + order.total_amount, 0);

  // Compute the optimistic patch for moving an order into a new stage.
  const buildStagePatch = (order: any, newStage: string) => {
    const customerType = order.customers?.customer_type || order.customer_type;
    const isCOD = order.payment_method === 'cod';
    const patch: any = { updated_at: new Date().toISOString() };
    switch (newStage) {
      case 'on_hold':
        patch.status = 'back_order';
        break;
      case 'requested':
        patch.status = 'requested';
        break;
      case 'preparing':
        patch.status = 'preparing';
        // COD stays pending until delivered; account customers stay pending; others auto-paid
        patch.payment_status = (customerType === 'account' || isCOD) ? 'pending' : 'paid';
        break;
      case 'loading':
        patch.status = 'loading';
        break;
      case 'en_route':
        patch.status = 'en_route';
        break;
      case 'delivered':
        patch.status = 'delivered';
        // COD is collected on delivery — auto-mark paid
        if (isCOD && order.payment_status !== 'paid') {
          patch.payment_status = 'paid';
          patch.payment_date = new Date().toISOString();
        }
        break;
      default:
        patch.status = newStage;
    }
    return patch;
  };

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    const order = orders.find(o => o.id === active.id);
    if (order) {
      setDraggedOrder(order);
    }
  };

  // Enhanced drag end handler with assignment dialog integration
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDraggedOrder(null);

    if (!over || !active.data.current) {
      return;
    }

    const { order, currentStage } = active.data.current;
    const newStage = over.id as string;

    if (currentStage === newStage) {
      return;
    }

    // Payment validation: prevent moving from requested if payment is pending
    // (except for account customers and COD orders — COD is collected on delivery)
    const customerType = order.customers?.customer_type || order.customer_type;
    const isCOD = order.payment_method === 'cod';
    if (currentStage === 'requested' && order.payment_status === 'pending' && customerType !== 'account' && !isCOD) {
      toast({
        title: "Payment Required",
        description: `Order ${order.order_number} requires payment confirmation before it can be moved`,
        variant: "destructive",
      });
      return;
    }

    // Truck/driver assignment dialog when moving to loading without truck
    if (newStage === 'loading' && (!order.truck_id || !order.truck_type)) {
      setOrderForAssignment(order);
      setShowAssignmentDialog(true);
      return;
    }

    await updateOrderStatus(order, currentStage, newStage);
  };

  // Handle truck/driver assignment completion
  const handleAssignmentComplete = async (assignments: {
    truckType: TruckType;
    truckId: string;
    driverId: string;
  }) => {
    if (!orderForAssignment) return;

    const previousSnapshot = orderForAssignment;

    try {
      const customerType = orderForAssignment.customers?.customer_type || orderForAssignment.customer_type;
      const isCOD = orderForAssignment.payment_method === 'cod';
      const updateData: any = {
        truck_type: assignments.truckType,
        truck_id: assignments.truckId,
        driver_id: assignments.driverId === 'unassigned' ? null : assignments.driverId,
        status: 'preparing',
        // COD stays pending until delivered
        payment_status: (customerType === 'account' || isCOD) ? 'pending' : 'paid',
        updated_at: new Date().toISOString()
      };

      // Optimistic update — card moves to Preparing immediately
      patchOrderInCache(orderForAssignment.id, updateData);

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderForAssignment.id);

      if (error) throw error;

      if (assignments.truckId && assignments.truckId !== 'none') {
        await supabase
          .from('trucks')
          .update({ status: 'assigned', updated_at: new Date().toISOString() })
          .eq('id', assignments.truckId);
      }

      if (profile?.full_name) {
        await activityLogger.orderStatusUpdate(
          orderForAssignment.id,
          orderForAssignment.order_number,
          orderForAssignment.customer_name,
          'requested',
          'preparing',
          profile.full_name
        );
      }

      toast({
        title: "Assignment Complete",
        description: `Order ${orderForAssignment.order_number} assigned and moved to preparing stage`,
      });
    } catch (error: any) {
      console.error('Error completing assignment:', error);
      // Roll back optimistic update
      patchOrderInCache(previousSnapshot.id, {
        status: previousSnapshot.status,
        payment_status: previousSnapshot.payment_status,
        truck_type: previousSnapshot.truck_type,
        truck_id: previousSnapshot.truck_id,
        driver_id: previousSnapshot.driver_id,
      });
      throw error;
    }
  };

  // Regular status update — optimistic, with rollback on failure
  const updateOrderStatus = async (order: any, currentStage: string, newStage: string) => {
    const patch = buildStagePatch(order, newStage);
    const previous = {
      status: order.status,
      payment_status: order.payment_status,
    };

    // Optimistic — card stays in dropped column instantly
    patchOrderInCache(order.id, patch);

    try {
      await updateOrderStatusService({
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        oldStatus: currentStage,
        newStatus: patch.status || newStage,
        updatedBy: profile?.full_name || 'Admin'
      });

      // Persist COD auto-paid on delivered (status service only writes status)
      if (patch.payment_status === 'paid' && patch.payment_date) {
        await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            payment_date: patch.payment_date,
          })
          .eq('id', order.id);
      }

      toast({
        title: "Order Moved",
        description: `Order ${order.order_number} moved to ${PIPELINE_STAGES.find(s => s.id === newStage)?.title}`,
      });
    } catch (error: any) {
      console.error('Error moving order:', error);
      // Roll back
      patchOrderInCache(order.id, previous);
      toast({
        title: "Error",
        description: "Failed to move order",
        variant: "destructive",
      });
    }
  };

  // Synchronize scroll positions
  useEffect(() => {
    const topScrollElement = topScrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    const mainScrollElement = mainScrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');

    if (!topScrollElement || !mainScrollElement) return;

    const handleTopScroll = () => {
      mainScrollElement.scrollLeft = topScrollElement.scrollLeft;
    };

    const handleMainScroll = () => {
      topScrollElement.scrollLeft = mainScrollElement.scrollLeft;
    };

    topScrollElement.addEventListener('scroll', handleTopScroll);
    mainScrollElement.addEventListener('scroll', handleMainScroll);

    return () => {
      topScrollElement.removeEventListener('scroll', handleTopScroll);
      mainScrollElement.removeEventListener('scroll', handleMainScroll);
    };
  }, [isLoading]);

  // Handle order card click
  const handleOrderClick = (order: any) => {
    setSelectedOrder(order);
    setIsEditDialogOpen(true);
  };

  // Handle order edit dialog close
  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    setSelectedOrder(null);
  };

  // Handle order update
  const handleOrderUpdate = () => {
    refetch();
    handleEditDialogClose();
  };

  // Handle assignment dialog close
  const handleAssignmentDialogClose = () => {
    setShowAssignmentDialog(false);
    setOrderForAssignment(null);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Jobs Management</h2>
            <p className="text-slate-600 mt-1">Track orders through your sales pipeline</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Error loading pipeline data. Please try again.</p>
              <Button onClick={() => refetch()} className="mt-2">Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-2">
          {/* Compact header: title + metrics + filters in one row */}
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-bold text-slate-800 flex items-center gap-1.5 text-base whitespace-nowrap">
              <BarChart3 className="w-4 h-4" />
              Jobs Management
            </h2>

            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span><span className="font-bold text-slate-800">{totalOrders}</span> orders</span>
              <span><span className="font-bold text-green-600">${totalValue.toFixed(0)}</span> value</span>
              {isLoading && <span className="text-slate-500">(Loading...)</span>}
            </div>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search orders, customers, PO..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
              {searchQuery.trim() && isSearching && (
                <span className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-[10px] text-slate-400">
                  Searching all orders…
                </span>
              )}
            </div>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="h-8 w-32 text-sm">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="h-8 px-2 flex items-center gap-1">
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>

          {/* Pipeline area */}
          <Card>
            <CardContent className="p-3">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-slate-600">Loading pipeline...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Inline color legend */}
                  <OpportunityCardColorLegend />

                  {/* Top Scroll Bar */}
                  <div className="border-b border-slate-200 pb-1">
                    <ScrollArea ref={topScrollRef} className="w-full">
                      <div
                        className="flex gap-4"
                        style={{ width: `${PIPELINE_STAGES.length * 320 + (PIPELINE_STAGES.length - 1) * 16}px` }}
                      >
                        {PIPELINE_STAGES.map(stage => (
                          <div key={`top-${stage.id}`} className="w-80 h-4 bg-slate-100 rounded-sm opacity-60" />
                        ))}
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </div>

                  {/* Main Pipeline */}
                  <ScrollArea ref={mainScrollRef} className="w-full">
                    <div className="flex gap-4 pb-4 min-h-[600px]">
                      {PIPELINE_STAGES.map(stage => (
                        <DroppablePipelineColumn
                          key={stage.id}
                          stage={stage}
                          orders={ordersByStage[stage.id] || []}
                          onOrderMove={refetch}
                          onOrderClick={handleOrderClick}
                        />
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId && draggedOrder ? (
            <div className="rotate-6 scale-105">
              <OpportunityCard 
                order={draggedOrder} 
                currentStage={draggedOrder.status} 
                onOrderMove={() => {}}
                onOrderClick={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Order Edit Dialog */}
      {selectedOrder && isEditDialogOpen && (
        <OrderEditDialog
          order={selectedOrder}
          onOrderUpdated={handleOrderUpdate}
          onClose={handleEditDialogClose}
        />
      )}

      {/* NEW: Truck/Driver Assignment Dialog */}
      <TruckDriverAssignmentDialog
        isOpen={showAssignmentDialog}
        onClose={handleAssignmentDialogClose}
        order={orderForAssignment}
        onAssignmentComplete={handleAssignmentComplete}
      />
    </>
  );
}
