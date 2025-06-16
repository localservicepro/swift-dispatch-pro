
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Filter, X, BarChart3 } from "lucide-react";
import { PipelineColumn } from "./opportunity/PipelineColumn";
import { useOpportunityData } from "./opportunity/useOpportunityData";

const PIPELINE_STAGES = [
  { 
    id: 'requested', 
    title: 'Order Requested', 
    color: 'bg-slate-100 border-slate-300',
    textColor: 'text-slate-700'
  },
  { 
    id: 'confirmed', 
    title: 'Order Confirmed', 
    color: 'bg-blue-100 border-blue-300',
    textColor: 'text-blue-700'
  },
  { 
    id: 'preparing', 
    title: 'Preparing', 
    color: 'bg-yellow-100 border-yellow-300',
    textColor: 'text-yellow-700'
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { orders, isLoading, error, refetch } = useOpportunityData();

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
      // Orders that are paid or have status other than 'requested' move to confirmed
      else if (order.payment_status === 'paid' || order.status === 'preparing') {
        stage = 'confirmed';
      }
      
      // Map other statuses directly
      if (order.status === 'preparing') {
        stage = 'preparing';
      } else if (order.status === 'loading') {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-8 h-8" />
            Opportunity Pipeline
          </h2>
          <p className="text-slate-600 mt-1">Track orders through your sales pipeline • Real-time updates enabled</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 min-h-[600px]">
              {PIPELINE_STAGES.map((stage) => (
                <PipelineColumn
                  key={stage.id}
                  stage={stage}
                  orders={ordersByStage[stage.id] || []}
                  onOrderMove={refetch}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
