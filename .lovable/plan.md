

## Add Portal Access Toggle & Auto-Enable on PIN Generation

### What Changes

Two small improvements to the Bulk PIN Management dialog:

1. **Auto-enable customer portal** -- already done in the edge function (line 174 sets `portal_access_enabled: true`). No backend change needed.

2. **Add a "Portal Access" toggle column** in the table so admins can quickly enable/disable portal access per customer directly from this dialog.

---

### Changes

#### 1. `src/components/customer/BulkPinManagementDialog.tsx`

- Add a new **"Portal Access"** column to the table between "PIN Status" and the checkbox column
- Each row gets a `Switch` toggle showing whether `portal_access_enabled` is true/false
- Toggling it calls `supabase.from('customers').update({ portal_access_enabled: value }).eq('id', customerId)` directly
- Update the local state optimistically so the UI reflects the change immediately
- Import `Switch` from `@/components/ui/switch`

The table columns become: Checkbox | Customer | Email | PIN Status | Portal Access (toggle)

#### 2. No edge function changes needed

The edge function already sets `portal_access_enabled: true` when generating PINs (line 174). This is working correctly.

---

### Technical Details

The toggle handler:
```typescript
const togglePortalAccess = async (customerId: string, enabled: boolean) => {
  // Optimistic update
  setCustomers(prev => prev.map(c => 
    c.id === customerId ? { ...c, portal_access_enabled: enabled } : c
  ));
  
  const { error } = await supabase
    .from('customers')
    .update({ portal_access_enabled: enabled, updated_at: new Date().toISOString() })
    .eq('id', customerId);
    
  if (error) {
    // Revert on failure
    setCustomers(prev => prev.map(c => 
      c.id === customerId ? { ...c, portal_access_enabled: !enabled } : c
    ));
    toast({ title: "Error", description: "Failed to update portal access", variant: "destructive" });
  }
};
```

