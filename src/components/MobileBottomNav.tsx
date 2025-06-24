import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  CreditCard,
  Mail,
  Settings,
  Users2,
  Target,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Truck,
} from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useState } from "react";

const menuItems = [
  { title: "Dashboard", icon: BarChart3, id: "dashboard" },
  { title: "Pipeline", icon: Target, id: "opportunities" },
  { title: "Orders", icon: ShoppingCart, id: "orders" },
  { title: "Products", icon: Package, id: "products" },
  { title: "Customers", icon: Users, id: "customers" },
  { title: "Payments", icon: CreditCard, id: "payments" },
  { title: "Fleet", icon: Truck, id: "trucks" },
  { title: "Team", icon: Users2, id: "drivers" },
  { title: "Emails", icon: Mail, id: "emails" },
  { title: "Settings", icon: Settings, id: "settings" },
];

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function MobileBottomNav({ activeTab, setActiveTab }: MobileBottomNavProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
      <ScrollArea className="w-full">
        <div className="flex items-center px-2 py-2">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex-shrink-0 flex-col gap-1 h-16 px-3 text-xs",
                activeTab === item.id
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="leading-tight">{item.title}</span>
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
