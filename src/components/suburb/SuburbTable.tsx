import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, MoreHorizontal, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SuburbTableProps {
  suburbs: any[];
  onEdit: (suburb: any) => void;
  onRefresh: () => void;
}

export function SuburbTable({ suburbs, onEdit, onRefresh }: SuburbTableProps) {
  const [selectedSuburbs, setSelectedSuburbs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSuburbs(suburbs.map(s => s.id));
    } else {
      setSelectedSuburbs([]);
    }
  };

  const handleSelectSuburb = (suburbId: string, checked: boolean) => {
    if (checked) {
      setSelectedSuburbs([...selectedSuburbs, suburbId]);
    } else {
      setSelectedSuburbs(selectedSuburbs.filter(id => id !== suburbId));
    }
  };

  const handleBulkStatusUpdate = async (isActive: boolean) => {
    if (selectedSuburbs.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select suburbs to update",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('bulk_update_suburb_status', {
        suburb_ids: selectedSuburbs,
        new_status: isActive
      });

      if (error) throw error;

      toast({
        title: "Bulk Update Successful",
        description: `Updated ${data} suburbs to ${isActive ? 'active' : 'inactive'}`,
      });

      setSelectedSuburbs([]);
      onRefresh();
    } catch (error) {
      console.error('Bulk update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update suburb status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (suburbId: string) => {
    if (!confirm('Are you sure you want to delete this suburb?')) return;

    try {
      const { error } = await supabase
        .from('suburbs')
        .delete()
        .eq('id', suburbId);

      if (error) throw error;

      toast({
        title: "Suburb Deleted",
        description: "Suburb has been successfully deleted",
      });

      onRefresh();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete suburb",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (suburb: any) => {
    try {
      const { error } = await supabase
        .from('suburbs')
        .update({ is_active: !suburb.is_active })
        .eq('id', suburb.id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Suburb ${suburb.is_active ? 'deactivated' : 'activated'}`,
      });

      onRefresh();
    } catch (error) {
      console.error('Status update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update suburb status",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Suburbs ({suburbs.length})</CardTitle>
          {selectedSuburbs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedSuburbs.length} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusUpdate(true)}
                disabled={isLoading}
              >
                <Eye className="w-4 h-4 mr-1" />
                Activate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusUpdate(false)}
                disabled={isLoading}
              >
                <EyeOff className="w-4 h-4 mr-1" />
                Deactivate
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedSuburbs.length === suburbs.length && suburbs.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Postcode</TableHead>
                <TableHead>Delivery Rate</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suburbs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No suburbs found
                  </TableCell>
                </TableRow>
              ) : (
                suburbs.map((suburb) => (
                  <TableRow key={suburb.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedSuburbs.includes(suburb.id)}
                        onCheckedChange={(checked) => handleSelectSuburb(suburb.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{suburb.name}</TableCell>
                    <TableCell>{suburb.state}</TableCell>
                    <TableCell>{suburb.postcode}</TableCell>
                    <TableCell>${suburb.delivery_rate}</TableCell>
                    <TableCell>
                      {suburb.distance_km ? `${suburb.distance_km}km` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={suburb.is_active ? "default" : "secondary"}>
                        {suburb.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(suburb)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(suburb)}>
                            {suburb.is_active ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(suburb.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}