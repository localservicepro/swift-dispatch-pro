
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
import { 
  DndContext, 
  DragEndEvent, 
  DragStartEvent,
  DragOverlay,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { OpportunityCard } from "./opportunity/OpportunityCard";
import { useAuth } from "./auth/AuthProvider";
import { activityLogger } from "@/utils/activityLogger";

const PIPELINE_STAGES = [
  { 
    id: 'requested', 
    title: 'Order Requested', 
    color: 'bg-slate-100 border-slate-300',
    textColor: 'text-slate-700'
  },
  { 
    id: 'preparing', 
    title: 'Confirmed & Preparing', 
    color: 'bg-blue-100 border-blue-300',
    textColor: 'text-blue-700'
  },
  { 
    id: 'loading', 
    title: 'Loading', 
    color: 'bg-orange-100 border-orange-300',
    textColor: 'text-orange-700'
  },
  { 
    id: 'en_route', 
    title: 'En Route', 
    color: 'bg-purple-100 border-purple-300',
    textColor: 'text-purple-700'
  },
  { 
    id: 'delivered', 
    title: 'Delivered', 
    color: 'bg-green-100 border-green-300',
    textColor: 'text-green-700'
  }
];

export function OpportunityPipeline() {
  const [searchQuery, setSearchQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedOrder, setDraggedOrder] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  // Refs for scroll synchronization
  const topScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  const { orders, isLoading, error, refetch } = useOpportunityData();

  // Configure drag sensors
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 8,
    },
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
        order.customer_name.toLowerCase().includes(query)
      );
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const today = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(order => 
            new Date(order.created_at) >= filterDate
          );
          break;
        case "week":
          filterDate.setDate(today.getDate() - 7);
          filtered = filtered.filter(order => 
            new Date(order.created_at) >= filterDate
          );
          break;
        case "month":
          filterDate.setMonth(today.getMonth() - 1);
          filtered = filtered.filter(order => 
            new Date(order.created_at) >= filterDate
          );
          break;
      }
    }

    return filtered;
  }, [orders, searchQuery, dateFilter]);

  // Group orders by pipeline stage
  const ordersByStage = useMemo(() => {
    const grouped = PIPELINE_STAGES.reduce((acc, stage) => {
      acc[stage.id] = [];
      return acc;
    }, {} as Record<string, any[]>);

    filteredOrders.forEach(order => {
      // Map order status to pipeline stage
      let stage = 'requested';
      
      // Orders with 'requested' status stay in 'requested' stage
      if (order.status === 'requested') {
        stage = 'requested';
      } 
      // Orders that are paid OR have status 'preparing' go to 'preparing' stage
      else if (order.payment_status === 'paid' || order.status === 'preparing') {
        stage = 'preparing';
      }
      
      // Map other statuses directly
      if (order.status === 'loading') {
        stage = 'loading';
      } else if (order.status === 'en_route') {
        stage = 'en_route';
      } else if (order.status === 'delivered') {
        stage = 'delivered';
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
    const { active } = event;
    setActiveId(active.id as string);
    
    const order = orders.find(o => o.id === active.id);
    if (order) {
      setDraggedOrder(order);
    }
  };

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

    // Validate stage transition
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

      refetch();
    } catch (error: any) {
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Opportunity Pipeline</h2>
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-8 h-8" />
              Opportunity Pipeline
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
              <CardTitle className="text-lg font-semibold text-slate-800">
                Pipeline Overview
                {isLoading && <span className="text-sm font-normal text-slate-500">(Loading...)</span>}
              </CardTitle>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="flex items-center gap-2"
                >
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
                  placeholder="Search by order number or customer name..."
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
                    <div className="flex gap-4" style={{ width: `${PIPELINE_STAGES.length * 320 + (PIPELINE_STAGES.length - 1) * 16}px` }}>
                      {PIPELINE_STAGES.map((stage) => (
                        <div key={`top-${stage.id}`} className="w-80 h-4 bg-slate-100 rounded-sm opacity-60" />
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>

                {/* Main Pipeline */}
                <ScrollArea ref={mainScrollRef} className="w-full">
                  <div className="flex gap-4 pb-4 min-h-[600px]">
                    {PIPELINE_STAGES.map((stage) => (
                      <DroppablePipelineColumn
                        key={stage.id}
                        stage={stage}
                        orders={ordersByStage[stage.id] || []}
                        onOrderMove={refetch}
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
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
