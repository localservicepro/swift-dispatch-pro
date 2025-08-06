import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Search, Plus, Download, Upload, Edit, Trash2 } from 'lucide-react';
import { SuburbTable } from './suburb/SuburbTable';
import { SuburbForm } from './suburb/SuburbForm';
import { SuburbImportDialog } from './suburb/SuburbImportDialog';
import { useSuburbManagement } from '@/hooks/useSuburbManagement';

export function SuburbManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingSuburb, setEditingSuburb] = useState(null);
  const { suburbs, refreshSuburbs } = useSuburbManagement();
  const { toast } = useToast();

  const handleCreateSuburb = () => {
    setEditingSuburb(null);
    setShowForm(true);
  };

  const handleEditSuburb = (suburb: any) => {
    setEditingSuburb(suburb);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingSuburb(null);
    refreshSuburbs();
  };

  const handleImportSuccess = () => {
    setShowImport(false);
    refreshSuburbs();
    toast({
      title: "Import Successful",
      description: "Suburbs have been imported successfully",
    });
  };

  const filteredSuburbs = suburbs.filter(suburb => {
    const matchesSearch = suburb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         suburb.postcode.includes(searchTerm) ||
                         suburb.state.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesState = !stateFilter || suburb.state === stateFilter;
    return matchesSearch && matchesState;
  });

  const states = [...new Set(suburbs.map(s => s.state))].sort();
  const activeCount = suburbs.filter(s => s.is_active).length;
  const inactiveCount = suburbs.length - activeCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Suburb Management
          </h2>
          <p className="text-slate-600 mt-1">Manage delivery suburbs and their rates</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={handleCreateSuburb}>
            <Plus className="w-4 h-4 mr-2" />
            Add Suburb
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Suburbs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suburbs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{inactiveCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">States</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{states.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="suburbs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="suburbs">All Suburbs</TabsTrigger>
          <TabsTrigger value="import">Import Data</TabsTrigger>
        </TabsList>

        <TabsContent value="suburbs" className="space-y-4">
          {/* Search and Filter */}
          <Card>
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="search">Search suburbs</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search by name, postcode, or state..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="state">Filter by state</Label>
                  <select
                    id="state"
                    className="w-full p-2 border rounded-md"
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                  >
                    <option value="">All states</option>
                    {states.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Showing {filteredSuburbs.length} of {suburbs.length} suburbs
                </span>
                {(searchTerm || stateFilter) && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setStateFilter('');
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Suburbs Table */}
          <SuburbTable 
            suburbs={filteredSuburbs}
            onEdit={handleEditSuburb}
            onRefresh={refreshSuburbs}
          />
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import Suburbs from CSV</CardTitle>
              <CardDescription>
                Upload a CSV file to bulk import suburbs and their delivery rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowImport(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Open Import Dialog
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {showForm && (
        <SuburbForm
          suburb={editingSuburb}
          isOpen={showForm}
          onClose={handleFormClose}
        />
      )}

      {showImport && (
        <SuburbImportDialog
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
}