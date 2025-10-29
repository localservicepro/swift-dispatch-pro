import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { BarChart3, Package, ShoppingCart, Users, CreditCard, Mail, Settings, Users2, Target, Trash2, Truck, ShoppingBag, MapPin, BookOpen } from "lucide-react";
import { useState } from "react";

const menuItems = [{
  title: "Dashboard",
  icon: BarChart3,
  id: "dashboard"
}, {
  title: "Opportunities",
  icon: Target,
  id: "opportunities"
}, {
  title: "Order Management",
  icon: ShoppingCart,
  id: "orders"
}, {
  title: "Products",
  icon: Package,
  id: "products"
}, {
  title: "Customers",
  icon: Users,
  id: "customers"
}, {
  title: "Payments",
  icon: CreditCard,
  id: "payments"
}, {
  title: "Fleet Management",
  icon: Truck,
  id: "trucks"
}, {
  title: "Team Management",
  icon: Users2,
  id: "drivers"
}, {
  title: "Suburb Management",
  icon: MapPin,
  id: "suburbs"
}, {
  title: "Email Management",
  icon: Mail,
  id: "emails"
}, {
  title: "Help & Guides",
  icon: BookOpen,
  id: "knowledgebase"
}, {
  title: "Settings",
  icon: Settings,
  id: "settings"
}];
interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}
export function AdminSidebar({
  activeTab,
  setActiveTab
}: AdminSidebarProps) {
  const [logoError, setLogoError] = useState(false);
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
              {menuItems.map(item => <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton onClick={() => setActiveTab(item.id)} className={cn("w-full justify-start", activeTab === item.id ? "text-primary bg-primary/10" : "hover:bg-accent hover:text-accent-foreground")}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </div>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>;
}