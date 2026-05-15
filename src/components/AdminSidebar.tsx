import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { BarChart3, Package, ShoppingCart, Users, CreditCard, Mail, Settings, Users2, Target, Truck, MapPin, BookOpen, User, FileBarChart } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

const menuItems = [{
  title: "Dashboard",
  icon: BarChart3,
  id: "dashboard",
  path: "/dashboard"
}, {
  title: "Opportunities",
  icon: Target,
  id: "opportunities",
  path: "/opportunities"
}, {
  title: "Order Management",
  icon: ShoppingCart,
  id: "orders",
  path: "/orders"
}, {
  title: "Products",
  icon: Package,
  id: "products",
  path: "/products"
}, {
  title: "Customers",
  icon: Users,
  id: "customers",
  path: "/customers"
}, {
  title: "Payments",
  icon: CreditCard,
  id: "payments",
  path: "/payments"
}, {
  title: "Fleet Management",
  icon: Truck,
  id: "trucks",
  path: "/fleet"
}, {
  title: "Team Management",
  icon: Users2,
  id: "drivers",
  path: "/team",
  requiresSuperAdmin: true
}, {
  title: "Suburb Management",
  icon: MapPin,
  id: "suburbs",
  path: "/suburbs"
}, {
  title: "Email Management",
  icon: Mail,
  id: "emails",
  path: "/emails"
}, {
  title: "Help & Guides",
  icon: BookOpen,
  id: "knowledgebase",
  path: "/knowledgebase"
}, {
  title: "My Profile",
  icon: User,
  id: "my-profile",
  path: "/my-profile"
}, {
  title: "Settings",
  icon: Settings,
  id: "settings",
  path: "/settings"
}];

export function AdminSidebar() {
  const [logoError, setLogoError] = useState(false);
  const location = useLocation();
  const { isSuperAdmin, isAdmin } = useUserRole();
  const handleLogoError = () => {
    console.error("Logo failed to load:", "/lovable-uploads/299f278a-b44f-48ee-80b0-722271e302f3.png");
    setLogoError(true);
  };
  const handleLogoLoad = () => {
    console.log("Logo loaded successfully");
  };
  return <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b px-4 py-4">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          {!logoError ? <img src="/lovable-uploads/299f278a-b44f-48ee-80b0-722271e302f3.png" alt="SwiftDispatch Pro" className="h-8 w-8 object-contain shrink-0" onError={handleLogoError} onLoad={handleLogoLoad} loading="eager" /> : <img alt="SwiftDispatch Pro" className="h-8 w-8 object-contain shrink-0" src="/lovable-uploads/fc386260-602a-4f4e-99fb-6747c37bdec4.png" />}
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
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
              {menuItems
                .filter(item => !item.requiresSuperAdmin || isSuperAdmin || isAdmin)
                .map(item => <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link 
                      to={item.path}
                      className={cn("w-full justify-start", location.pathname === item.path && "text-primary bg-primary/10")}
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </div>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>;
}