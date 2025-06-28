
import { Menu, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PersonalizedGreeting } from "./PersonalizedGreeting";

interface MobileHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  profile?: {
    full_name?: string;
    email?: string;
  };
}

const getPageTitle = (activeTab: string) => {
  switch (activeTab) {
    case "dashboard":
      return "Dashboard";
    case "opportunities":
      return "Opportunity Pipeline";
    case "orders":
      return "Order Management";
    case "products":
      return "Product Management";
    case "customers":
      return "Customer Management";
    case "payments":
      return "Payment Management";
    case "trucks":
      return "Fleet Management";
    case "drivers":
      return "Team Management";
    case "emails":
      return "Email Management";
    case "settings":
      return "Settings";
    default:
      return "Admin Panel";
  }
};

export function MobileHeader({ activeTab, setActiveTab, profile }: MobileHeaderProps) {
  const renderTitle = () => {
    if (activeTab === "dashboard") {
      return (
        <div className="text-base font-semibold text-slate-800">
          <PersonalizedGreeting profile={profile} />
        </div>
      );
    }
    
    return (
      <h1 className="text-lg font-semibold text-slate-800">
        {getPageTitle(activeTab)}
      </h1>
    );
  };

  return (
    <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
      {renderTitle()}
      
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-64">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                activeTab === "settings"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-slate-100"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
