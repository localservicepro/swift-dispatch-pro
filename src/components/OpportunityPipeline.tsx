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
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { OpportunityCard } from "./opportunity/OpportunityCard";
import { useAuth } from "./auth/AuthProvider";
import { activityLogger } from "@/utils/activityLogger";
import { OrderEditDialog } from "./order/OrderEditDialog";
import { TruckDriverAssignmentDialog } from "./order/TruckDriverAssignmentDialog";
import { Database } from "@/integrations/supabase/types";

type TruckType = Database["public"]["Enums"]["truck_type"];

const PIPELINE_STAGES = [{
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
    orders,
    isLoading,
    error,
    refetch,
    invalidateOrdersCache
  } = useOpportunityData();

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
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(query) || 
        order.customer_name.toLowerCase().includes(query) ||
        (order.purchase_order && order.purchase_order.toLowerCase().includes(query)) ||
        (order.company_name && order.company_name.toLowerCase().includes(query)) ||
        (order.business_name && order.business_name.toLowerCase().includes(query))
      );
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const today = new Date();
      const filterDate = new Date();
      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(order => new Date(order.created_at) >= filterDate);
          break;
        case "week":
          filterDate.setDate(today.getDate() - 7);
          filtered = filtered.filter(order => new Date(order.created_at) >= filterDate);
          break;
        case "month":
          filterDate.setMonth(today.getMonth() - 1);
          filtered = filtered.filter(order => new Date(order.created_at) >= filterDate);
          break;
      }
    }
    return filtered;
  }, [orders, searchQuery, dateFilter]);

  // Group orders by pipeline stage with payment-priority logic
  const ordersByStage = useMemo(() => {
    const grouped = PIPELINE_STAGES.reduce((acc, stage) => {
      acc[stage.id] = [];
      return acc;
    }, {} as Record<string, any[]>);

    filteredOrders.forEach(order => {
      let stage = 'requested';

      // Payment status takes priority - orders with pending payment stay in requested
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

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const {
      active
    } = event;
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

    // If dropping in the same stage, do nothing
    if (currentStage === newStage) {
      return;
    }

    // Payment validation: prevent moving from requested if payment is pending
    if (currentStage === 'requested' && order.payment_status === 'pending') {
      toast({
        title: "Payment Required",
        description: `Order ${order.order_number} requires payment confirmation before it can be moved`,
        variant: "destructive",
      });
      return;
    }

    // NEW: Handle truck/driver assignment when moving to preparing stage
    if (newStage === 'preparing' && (!order.truck_id || !order.truck_type)) {
      console.log('Order needs truck assignment, opening dialog:', order.order_number);
      setOrderForAssignment(order);
      setShowAssignmentDialog(true);
      return; // Don't proceed with status update yet
    }

    // Validate stage transition for other stages
    const stageOrder = ['requested', 'preparing', 'loading', 'en_route', 'delivered'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const newIndex = stageOrder.indexOf(newStage);

    // Don't allow moving backwards (except from requested to any stage for flexibility)
    if (currentStage !== 'requested' && newIndex < currentIndex) {
      toast({
        title: "Invalid Move",
        description: "Orders cannot be moved backwards in the pipeline",
        variant: "destructive",
      });
      return;
    }

    // Don't allow skipping stages (except from requested)
    if (currentStage !== 'requested' && newIndex > currentIndex + 1) {
      toast({
        title: "Invalid Move",
        description: "Orders must progress through stages sequentially",
        variant: "destructive",
      });
      return;
    }

    // Proceed with regular status update for other stage transitions
    await updateOrderStatus(order, currentStage, newStage);
  };

  // Handle truck/driver assignment completion
  const handleAssignmentComplete = async (assignments: {
    truckType: TruckType;
    truckId: string;
    driverId: string;
  }) => {
    if (!orderForAssignment) return;

    try {
      console.log('Completing assignment for order:', orderForAssignment.order_number, assignments);

      const updateData: any = {
        truck_type: assignments.truckType,
        truck_id: assignments.truckId,
        driver_id: assignments.driverId === 'unassigned' ? null : assignments.driverId,
        status: 'preparing',
        payment_status: 'paid',
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderForAssignment.id);

      if (error) throw error;

      // Update truck status to assigned if a truck was selected
      if (assignments.truckId && assignments.truckId !== 'none') {
        await supabase
          .from('trucks')
          .update({ 
            status: 'assigned',
            updated_at: new Date().toISOString()
          })
          .eq('id', assignments.truckId);
      }

      // Log the activity
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

      // Use enhanced cache invalidation
      await invalidateOrdersCache('truck and driver assignment');
      
    } catch (error: any) {
      console.error('Error completing assignment:', error);
      throw error;
    }
  };

  // Regular status update function for non-assignment transitions
  const updateOrderStatus = async (order: any, currentStage: string, newStage: string) => {
    try {
      let updateData: any = {};

      switch (newStage) {
        case 'preparing':
          updateData = {
            payment_status: 'paid',
            status: 'preparing'
          };
          break;
        case 'loading':
          updateData = { status: 'loading' };
          break;
        case 'en_route':
          updateData = { status: 'en_route' };
          break;
        case 'delivered':
          updateData = { status: 'delivered' };
          break;
        default:
          updateData = { status: newStage };
      }

      console.log('Updating order status:', order.order_number, currentStage, '->', newStage);

      const { error } = await supabase
        .from('orders')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      // Log the activity
      if (profile?.full_name) {
        await activityLogger.orderStatusUpdate(
          order.id,
          order.order_number,
          order.customer_name,
          currentStage,
          newStage,
          profile.full_name
        );
      }

      toast({
        title: "Order Moved",
        description: `Order ${order.order_number} moved to ${PIPELINE_STAGES.find(s => s.id === newStage)?.title}`,
      });

      // Use enhanced cache invalidation
      await invalidateOrdersCache('status update via drag and drop');
    } catch (error: any) {
      console.error('Error moving order:', error);
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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                <BarChart3 className="w-8 h-8" />
                Jobs Management
              </h2>
              <p className="text-slate-600 mt-1">Track orders through your sales pipeline • Drag to move orders • Real-time updates enabled</p>
            </div>
            
            {/* Pipeline Metrics */}
            <div className="hidden md:flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800">{totalOrders}</p>
                <p className="text-sm text-slate-600">Total Orders</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">${totalValue.toFixed(0)}</p>
                <p className="text-sm text-slate-600">Pipeline Value</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-slate-800">
                  {isLoading && <span className="text-sm font-normal text-slate-500">(Loading...)</span>}
                </div>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters} className="flex items-center gap-2">
                    <X className="h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
              
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by order number, customer name, business name, or PO number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2 sm:w-48">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-slate-600">Loading pipeline...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Top Scroll Bar */}
                  <div className="border-b border-slate-200 pb-2">
                    <p className="text-xs text-slate-500 mb-2">Scroll to navigate pipeline stages • Drag cards to move between stages</p>
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
