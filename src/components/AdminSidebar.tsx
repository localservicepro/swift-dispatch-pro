import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  CreditCard,
  Mail,
  Settings,
  Truck,
  Target,
  Trash2,
} from "lucide-react";

const menuItems = [
  {
    title: "Dashboard",
    icon: BarChart3,
    id: "dashboard",
  },
  {
    title: "Opportunities",
    icon: Target,
    id: "opportunities",
  },
  {
    title: "Order Management",
    icon: ShoppingCart,
    id: "orders",
  },
  {
    title: "Products",
    icon: Package,
    id: "products",
  },
  {
    title: "Customers",
    icon: Users,
    id: "customers",
  },
  {
    title: "Payments",
    icon: CreditCard,
    id: "payments",
  },
  {
    title: "Team Management",
    icon: Truck,
    id: "drivers",
  },
  {
    title: "Email Management",
    icon: Mail,
    id: "emails",
  },
  {
    title: "Settings",
    icon: Settings,
    id: "settings",
  },
];

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function AdminSidebar({ activeTab, setActiveTab }: AdminSidebarProps) {
  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-4 w-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">SwiftDispatch Pro</span>
            <span className="truncate text-xs text-muted-foreground">
              Order Management
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-2 p-4">
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "w-full justify-start",
                      activeTab === item.id
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}
