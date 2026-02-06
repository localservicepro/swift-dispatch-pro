

## Fix Product Search Relevance - Show Best Matches First

### The Problem
When searching for products (e.g., "soil"), the results are sorted by stock quantity instead of search relevance. This means "Blended Soil" (the most common product) appears at the bottom because other products like "Organic Mulch/Compost" have higher stock levels.

### The Solution
Implement relevance-based sorting that prioritizes:
1. **Exact name match** - Product name equals the search term
2. **Name starts with** - Product name begins with the search term (e.g., "Soil Mix")
3. **Name contains** - Product name contains the search term anywhere
4. **Description/SKU match** - Search term found in description or SKU only

Within each relevance tier, secondary sort by stock quantity (descending) then name (alphabetically).

---

### Files to Modify

#### 1. `src/components/order/ProductSelectionStep.tsx`

**Lines 118-167** - Update `loadProducts` function:

- After fetching products, add client-side relevance sorting when a search query is active
- Sort products by relevance score:
  - Score 4: Name exactly matches search term (case-insensitive)
  - Score 3: Name starts with search term
  - Score 2: Name contains search term
  - Score 1: Only in description or SKU

```typescript
const loadProducts = useCallback(async () => {
  setLoading(true);
  let query = supabase
    .from('products')
    .select(`...`)
    .eq('is_active', true);

  if (debouncedSearchQuery) {
    query = query.or(`name.ilike.%${debouncedSearchQuery}%,...`);
  }

  // ... stock filter logic ...

  const { data, error } = await query.limit(500);

  if (!error && data) {
    let processedProducts = data.map(product => ({
      ...product,
      images: Array.isArray(product.images) ? product.images : []
    }));

    // Apply relevance sorting when searching
    if (debouncedSearchQuery) {
      const searchLower = debouncedSearchQuery.toLowerCase().trim();
      processedProducts.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        
        // Calculate relevance scores
        const getScore = (name: string) => {
          if (name === searchLower) return 4;          // Exact match
          if (name.startsWith(searchLower)) return 3;  // Starts with
          if (name.includes(searchLower)) return 2;    // Contains in name
          return 1;                                     // In description/SKU only
        };
        
        const aScore = getScore(aName);
        const bScore = getScore(bName);
        
        // Sort by relevance first, then stock, then name
        if (aScore !== bScore) return bScore - aScore;
        if (a.stock_quantity !== b.stock_quantity) return b.stock_quantity - a.stock_quantity;
        return aName.localeCompare(bName);
      });
    } else {
      // No search - sort by stock then name
      processedProducts.sort((a, b) => {
        if (a.stock_quantity !== b.stock_quantity) return b.stock_quantity - a.stock_quantity;
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
    }
    
    setProducts(processedProducts);
  }
  setLoading(false);
}, [debouncedSearchQuery, selectedCategory, stockFilter]);
```

#### 2. `src/components/order/AddProductToSplitDialog.tsx`

**Lines 25-59** - Update `fetchProducts` function with same relevance sorting logic.

---

### Expected Behavior After Fix

When searching for "soil":

| Before | After |
|--------|-------|
| 1. Organic Mulch/Compost (Stock: 279920) | 1. SHGS Blended Soil Bag (starts with search term) |
| 2. Premium Organic Soil (Stock: 2208) | 2. Premium Organic Soil (contains "Soil" in name) |
| 3. SHGS Blended Soil Bag (Stock: 1867) | 3. Organic Mulch/Compost (matches in description) |

When searching for "blended":
- "Blended Soil" appears first (name starts with "blended")

---

### Technical Notes
- Sorting done client-side after Supabase query returns results
- No database schema changes required
- Maintains stock quantity as secondary sort criteria
- Works with existing debounce for performance

