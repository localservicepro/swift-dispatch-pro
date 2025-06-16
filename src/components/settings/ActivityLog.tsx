
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, Download, Clock, User, FileText } from "lucide-react";
import { format } from "date-fns";

interface ActivityLog {
  id: string;
  action_type: string;
  target_type: string;
  target_id?: string;
  target_details?: any;
  old_values?: any;
  new_values?: any;
  description: string;
  created_at: string;
  admin_name: string;
}

// Helper function to safely access properties from Json type
const getTargetDetail = (target_details: any, key: string): string | undefined => {
  if (!target_details || typeof target_details !== 'object') return undefined;
  return target_details[key];
};

export function ActivityLog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState<string>("all");
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>("all");

  // Fetch activity logs
  const { data: activityLogs = [], isLoading, error, refetch } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: async () => {
      console.log('Fetching activity logs...');
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          id,
          action_type,
          target_type,
          target_id,
          target_details,
          old_values,
          new_values,
          description,
          created_at,
          profiles!activity_logs_admin_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching activity logs:', error);
        throw error;
      }

      console.log('Fetched activity logs:', data);
      return data.map(log => ({
        ...log,
        admin_name: log.profiles?.full_name || 'Unknown Admin'
      }));
    },
  });

  // Filter activity logs
  const filteredLogs = useMemo(() => {
    let filtered = activityLogs;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(log => {
        const orderNumber = getTargetDetail(log.target_details, 'order_number');
        const customerName = getTargetDetail(log.target_details, 'customer_name');
        
        return log.description.toLowerCase().includes(query) ||
               log.admin_name.toLowerCase().includes(query) ||
               (orderNumber && orderNumber.toLowerCase().includes(query)) ||
               (customerName && customerName.toLowerCase().includes(query));
      });
    }

    // Apply action type filter
    if (actionTypeFilter !== "all") {
      filtered = filtered.filter(log => log.action_type === actionTypeFilter);
    }

    // Apply target type filter
    if (targetTypeFilter !== "all") {
      filtered = filtered.filter(log => log.target_type === targetTypeFilter);
    }

    return filtered;
  }, [activityLogs, searchQuery, actionTypeFilter, targetTypeFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setActionTypeFilter("all");
    setTargetTypeFilter("all");
  };

  const hasActiveFilters = searchQuery.trim() !== "" || actionTypeFilter !== "all" || targetTypeFilter !== "all";

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case "status_update": return "bg-blue-100 text-blue-800";
      case "order_cancel": return "bg-red-100 text-red-800";
      case "order_create": return "bg-green-100 text-green-800";
      case "invoice_send": return "bg-purple-100 text-purple-800";
      case "payment_update": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTargetTypeIcon = (targetType: string) => {
    switch (targetType) {
      case "order": return <FileText className="h-4 w-4" />;
      case "customer": return <User className="h-4 w-4" />;
      case "invoice": return <FileText className="h-4 w-4" />;
      case "payment": return <Clock className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const exportToCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Timestamp,Admin,Action Type,Target Type,Description,Target Details\n" +
      filteredLogs.map(log => {
        const targetDetails = log.target_details ? JSON.stringify(log.target_details) : '';
        return `"${format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}","${log.admin_name}","${log.action_type}","${log.target_type}","${log.description}","${targetDetails}"`;
      }).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `activity_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600">
            <p>Error loading activity logs. Please try again.</p>
            <Button onClick={() => refetch()} className="mt-2">Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-800">
            Activity Log
            {!isLoading && (
              <span className="text-sm font-normal text-slate-500 ml-2">
                ({filteredLogs.length} of {activityLogs.length} activities)
              </span>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="flex items-center gap-2"
              disabled={filteredLogs.length === 0}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
        
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search activities, admin names, order numbers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 sm:w-48">
            <Filter className="h-4 w-4 text-slate-400" />
            <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="status_update">Status Updates</SelectItem>
                <SelectItem value="order_cancel">Order Cancellations</SelectItem>
                <SelectItem value="order_create">Order Creation</SelectItem>
                <SelectItem value="invoice_send">Invoice Sent</SelectItem>
                <SelectItem value="payment_update">Payment Updates</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 sm:w-48">
            <Select value={targetTypeFilter} onValueChange={setTargetTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Target Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Targets</SelectItem>
                <SelectItem value="order">Orders</SelectItem>
                <SelectItem value="customer">Customers</SelectItem>
                <SelectItem value="invoice">Invoices</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-slate-600">Loading activity logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            {hasActiveFilters ? (
              <div>
                <p>No activities match your current filters.</p>
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="mt-2"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <p>No activity logs found.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const orderNumber = getTargetDetail(log.target_details, 'order_number');
                  const customerName = getTargetDetail(log.target_details, 'customer_name');

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.admin_name}
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionTypeColor(log.action_type)}>
                          {log.action_type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTargetTypeIcon(log.target_type)}
                          <span className="capitalize">{log.target_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {log.description}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {log.target_details && (
                          <div className="space-y-1">
                            {orderNumber && (
                              <div>Order: {orderNumber}</div>
                            )}
                            {customerName && (
                              <div>Customer: {customerName}</div>
                            )}
                            {log.old_values && log.new_values && (
                              <div className="text-xs">
                                {Object.keys(log.old_values).map(key => (
                                  <div key={key}>
                                    {key}: {log.old_values[key]} → {log.new_values[key]}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
