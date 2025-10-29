import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { BarChart3, Package, ShoppingCart, Users, CreditCard, Mail, Settings, Users2, Target, Truck, MapPin, BookOpen } from "lucide-react";
import { useState } from "react";

const menuItems = [
  { title: "Dashboard", icon: BarChart3, path: "/dashboard" },
  { title: "Pipeline", icon: Target, path: "/pipeline" },
  { title: "Orders", icon: ShoppingCart, path: "/orders" },
  { title: "Products", icon: Package, path: "/products" },
  { title: "Customers", icon: Users, path: "/customers" },
  { title: "Payments", icon: CreditCard, path: "/payments" },
  { title: "Fleet", icon: Truck, path: "/fleet" },
  { title: "Team", icon: Users2, path: "/team" },
  { title: "Suburbs", icon: MapPin, path: "/suburbs" },
  { title: "Emails", icon: Mail, path: "/emails" },
  { title: "Help Center", icon: BookOpen, path: "/knowledgebase" },
  { title: "Settings", icon: Settings, path: "/settings" },
];
export function AdminSidebar() {
  const location = useLocation();
  const [logoError, setLogoError] = useState(false);
  
  const isActive = (path: string) => {
    if (path === "/dashboard" && location.pathname === "/") return true;
    return location.pathname === path;
  };
  const handleLogoError = () => {
    console.error("Logo failed to load:", "/lovable-uploads/299f278a-b44f-48ee-80b0-722271e302f3.png");
    setLogoError(true);
  };
  const handleLogoLoad = () => {
    console.log("Logo loaded successfully");
  };
  return <Sidebar className="border-r">
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-2">
          {!logoError ? <img src="/lovable-uploads/299f278a-b44f-48ee-80b0-722271e302f3.png" alt="SwiftDispatch Pro" className="h-8 w-8 object-contain" onError={handleLogoError} onLoad={handleLogoLoad} loading="eager" /> : <img alt="SwiftDispatch Pro" className="h-8 w-8 object-contain" onError={() => {
          // Final fallback to Package icon if both images fail
        }} src="/lovable-uploads/fc386260-602a-4f4e-99fb-6747c37bdec4.png" />}
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
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={cn(
                      "w-full justify-start",
                      isActive(item.path) && "bg-primary/10 text-primary font-semibold"
                    )}
                  >
                    <Link to={item.path}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>;
}