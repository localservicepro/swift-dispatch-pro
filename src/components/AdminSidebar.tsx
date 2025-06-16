
import { Calendar, Settings, Users, FileText, ChartBar, UserCheck } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const menuItems = [
  {
    title: "Dashboard",
    icon: ChartBar,
    key: "dashboard",
  },
  {
    title: "Orders",
    icon: FileText,
    key: "orders",
  },
  {
    title: "Products",
    icon: Calendar,
    key: "products",
  },
  {
    title: "Customers",
    icon: UserCheck,
    key: "customers",
  },
  {
    title: "Payments",
    icon: Calendar,
    key: "payments",
  },
  {
    title: "Staffs",
    icon: Users,
    key: "drivers",
  },
  {
    title: "Settings",
    icon: Settings,
    key: "settings",
  },
];

export function AdminSidebar({ activeTab, setActiveTab }: AdminSidebarProps) {
  return (
    <Sidebar className="border-r border-slate-200">
      <SidebarHeader className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Admin Panel</h1>
            <p className="text-sm text-slate-600">Business Management Hub</p>
          </div>
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-600 uppercase text-xs font-semibold tracking-wider">
            Main Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    onClick={() => setActiveTab(item.key)}
                    className={`w-full justify-start transition-all duration-200 ${
                      activeTab === item.key
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-slate-100"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
