
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface ProductFiltersProps {
  searchQuery: string;
  selectedCategory: string;
  categories: Category[];
  onSearchChange: (query: string) => void;
  onCategoryChange: (categoryId: string) => void;
}

export function ProductFilters({ 
  searchQuery, 
  selectedCategory, 
  categories, 
  onSearchChange, 
  onCategoryChange 
}: ProductFiltersProps) {
  return (
    <div className="flex gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <Select value={selectedCategory} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
