import { Menu, Settings, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PersonalizedGreeting } from "./PersonalizedGreeting";
import { ThemeToggle } from "./theme/ThemeToggle";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "react-router-dom";

interface MobileHeaderProps {
  profile?: {
    full_name?: string;
    email?: string;
  };
}

export function MobileHeader({ profile }: MobileHeaderProps) {
  const location = useLocation();
  const { signOut, signingOut } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await signOut();
    
    if (error) {
      toast({
        title: "Sign Out Failed",
        description: "There was an error signing out. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
    }
  };

  return (
    <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
      <div className="text-base font-semibold text-slate-800">
        <PersonalizedGreeting profile={profile} />
      </div>
      
      <div className="flex items-center gap-1">
      <ThemeToggle className="h-8 w-8" />
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
          <div className="mt-6 space-y-2">
            <Link
              to="/settings"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                location.pathname === "/settings"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-slate-100"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>
            
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              {signingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              <span>{signingOut ? "Signing Out..." : "Sign Out"}</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
