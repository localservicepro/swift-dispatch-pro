import { cn } from "@/lib/utils";
import {
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  CreditCard,
  Truck,
  Users2,
  Target,
  BookOpen,
} from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Link, useLocation } from "react-router-dom";

const menuItems = [
  { title: "Dashboard", icon: BarChart3, id: "dashboard", path: "/dashboard" },
  { title: "Pipeline", icon: Target, id: "opportunities", path: "/opportunities" },
  { title: "Orders", icon: ShoppingCart, id: "orders", path: "/orders" },
  { title: "Products", icon: Package, id: "products", path: "/products" },
  { title: "Customers", icon: Users, id: "customers", path: "/customers" },
  { title: "Payments", icon: CreditCard, id: "payments", path: "/payments" },
  { title: "Fleet", icon: Truck, id: "trucks", path: "/fleet" },
  { title: "Team", icon: Users2, id: "drivers", path: "/team" },
  { title: "Help", icon: BookOpen, id: "knowledgebase", path: "/knowledgebase" },
];

export function MobileBottomNav() {
  const location = useLocation();
  
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
      <ScrollArea className="w-full">
        <div className="flex items-center px-2 py-2">
          {menuItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                "flex-shrink-0 flex flex-col items-center gap-1 h-16 px-3 text-xs rounded-md transition-colors",
                location.pathname === item.path
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="leading-tight">{item.title}</span>
            </Link>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
