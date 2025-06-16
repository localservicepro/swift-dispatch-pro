
import { Calendar, Settings, Users, FileText, ChartBar, UserCheck } from "lucide-react";

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
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
    title: "Staffs",
    icon: Users,
    key: "drivers",
  },
];

export function MobileBottomNav({ activeTab, setActiveTab }: MobileBottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 md:hidden z-50">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            className={`flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 rounded-lg transition-colors ${
              activeTab === item.key
                ? "bg-primary/10 text-primary"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <item.icon className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium truncate">{item.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
