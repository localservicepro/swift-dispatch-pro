
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  CreditCard,
  Mail,
  Users2,
  Target,
  Truck,
  BookOpen,
} from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const menuItems = [
  { title: "Dashboard", icon: BarChart3, path: "/" },
  { title: "Pipeline", icon: Target, path: "/pipeline" },
  { title: "Orders", icon: ShoppingCart, path: "/orders" },
  { title: "Products", icon: Package, path: "/products" },
  { title: "Customers", icon: Users, path: "/customers" },
  { title: "Payments", icon: CreditCard, path: "/payments" },
  { title: "Fleet", icon: Truck, path: "/fleet" },
  { title: "Team", icon: Users2, path: "/team" },
  { title: "Help", icon: BookOpen, path: "/knowledgebase" },
];

export function MobileBottomNav() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
      <ScrollArea className="w-full">
        <div className="flex items-center px-2 py-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex-shrink-0 flex flex-col items-center justify-center gap-1 h-16 px-3 text-xs rounded-md transition-colors",
                isActive(item.path)
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
