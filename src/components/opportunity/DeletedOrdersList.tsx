import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  RotateCcw, 
  Trash2, 
  Calendar, 
  User, 
  DollarSign,
  Clock,
  AlertCircle,
  Split,
  Link2
} from "lucide-react";
import { useDeletedOrdersData } from "./useDeletedOrdersData";
import { useSplitOrderGroups } from "@/hooks/useSplitOrderGroups";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DeletedOrdersList() {
  const [searchQuery, setSearchQuery] = useState("");
  const { deletedOrders, isLoading, restoreOrder } = useDeletedOrdersData();
  const { restoreSplitOrderGroup } = useSplitOrderGroups();

  // Group deleted orders by split relationships
  const groupedOrders = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    const standaloneOrders: any[] = [];

    deletedOrders.forEach(order => {
      const groupKey = order.master_order_id || (order.is_split_order ? 'orphaned' : null);
      
      if (groupKey && groupKey !== 'orphaned') {
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(order);
      } else if (order.is_split_order) {
        // This is a master order with splits
        const splitOrders = deletedOrders.filter(o => o.master_order_id === order.id);
        if (splitOrders.length > 0) {
          groups[order.id] = [order, ...splitOrders];
        } else {
          standaloneOrders.push(order);
        }
      } else {
        standaloneOrders.push(order);
      }
    });

    return { groups: Object.values(groups), standaloneOrders };
  }, [deletedOrders]);

  // Filter orders by search query
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return groupedOrders;
    
    const query = searchQuery.toLowerCase().trim();
    
    const filteredGroups = groupedOrders.groups.filter(group =>
      group.some(order => 
        order.order_number.toLowerCase().includes(query) ||
        order.customer_name.toLowerCase().includes(query)
      )
    );
    
    const filteredStandalone = groupedOrders.standaloneOrders.filter(order => 
      order.order_number.toLowerCase().includes(query) ||
      order.customer_name.toLowerCase().includes(query)
    );

    return { groups: filteredGroups, standaloneOrders: filteredStandalone };
  }, [groupedOrders, searchQuery]);

  const totalFilteredOrders = filteredResults.groups.reduce((sum, group) => sum + group.length, 0) + 
                             filteredResults.standaloneOrders.length;

  const formatDeletedDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getDeletedBadgeColor = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return "bg-red-100 text-red-800"; // Recently deleted
    } else if (diffInHours < 168) {
      return "bg-orange-100 text-orange-800"; // This week
    } else {
      return "bg-gray-100 text-gray-800"; // Older
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading deleted orders...</p>
        </div>
      </div>
    );
  }

  const handleRestoreGroup = async (masterOrder: any) => {
    try {
      await restoreSplitOrderGroup(masterOrder.id);
    } catch (error) {
      console.error('Failed to restore split order group:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-red-600" />
            Deleted Orders
          </h2>
          <p className="text-slate-600 mt-1">Manage and restore deleted orders</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-red-600 border-red-300">
            {totalFilteredOrders} deleted orders
          </Badge>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search deleted orders by number or customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {totalFilteredOrders === 0 ? (
            <div className="text-center py-8 text-slate-400">
              {searchQuery ? (
                <p>No deleted orders match your search</p>
              ) : (
                <div>
                  <Trash2 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium mb-2">No deleted orders</p>
                  <p className="text-sm">Deleted orders will appear here and can be restored</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Split Order Groups */}
              {filteredResults.groups.map((group, groupIndex) => {
                const masterOrder = group.find(o => !o.master_order_id) || group[0];
                const splitOrders = group.filter(o => o.master_order_id);
                const totalAmount = group.reduce((sum, order) => sum + order.total_amount, 0);

                return (
                  <Card key={`group-${groupIndex}`} className="border-2 border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Split className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-slate-800">Split Order Group</h3>
                          </div>
                          <Badge variant="outline" className="text-blue-600 border-blue-300">
                            {group.length} orders
                          </Badge>
                          <Badge className={getDeletedBadgeColor(masterOrder.deleted_at)}>
                            <Clock className="w-3 h-3 mr-1" />
                            Deleted {formatDeletedDate(masterOrder.deleted_at)}
                          </Badge>
                        </div>
                        <span className="text-lg font-bold text-green-600">
                          ${totalAmount.toFixed(2)} total
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{masterOrder.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link2 className="w-4 h-4" />
                          <span>Master: {masterOrder.order_number}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(masterOrder.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* List all orders in the group */}
                      <div className="space-y-2 mb-4">
                        {group.map((order) => (
                          <div key={order.id} className="bg-white rounded p-3 border text-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{order.order_number}</span>
                                {!order.master_order_id && (
                                  <Badge variant="secondary" className="text-xs">Master</Badge>
                                )}
                              </div>
                              <span className="text-slate-600">${order.total_amount.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex items-center gap-2">
                              <RotateCcw className="w-4 h-4" />
                              Restore Group
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-orange-600" />
                                Restore Split Order Group
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to restore this entire split order group?
                                <br />
                                <br />
                                This will restore <strong>{group.length} orders</strong> for <strong>{masterOrder.customer_name}</strong>:
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                  {group.map(order => (
                                    <li key={order.id}>{order.order_number} - ${order.total_amount.toFixed(2)}</li>
                                  ))}
                                </ul>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRestoreGroup(masterOrder)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Restore Group
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Standalone Orders */}
              {filteredResults.standaloneOrders.map((order) => (
                <Card key={order.id} className="border border-red-200 hover:border-red-300 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-800">{order.order_number}</h3>
                          <Badge className={getDeletedBadgeColor(order.deleted_at)}>
                            <Clock className="w-3 h-3 mr-1" />
                            Deleted {formatDeletedDate(order.deleted_at)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>{order.customer_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-green-600">${order.total_amount.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(order.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div className="mt-2 text-xs text-slate-500">
                          <span>Deleted by: {order.deleted_by_name}</span>
                          {order.payment_status && (
                            <span className="ml-4">Payment: {order.payment_status}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex items-center gap-2">
                              <RotateCcw className="w-4 h-4" />
                              Restore
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-orange-600" />
                                Restore Order
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to restore order <strong>{order.order_number}</strong>?
                                <br />
                                <br />
                                This will:
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                  <li>Move the order back to the active pipeline</li>
                                  <li>Make it visible in the opportunities view</li>
                                  <li>Allow normal order processing to continue</li>
                                </ul>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => restoreOrder(order.id, order.order_number)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Restore Order
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
