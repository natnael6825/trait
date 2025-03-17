import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Search,
  CreditCard,
  Settings,
  LogOut,
  HelpCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../../supabase/auth";
import { useState, useEffect } from "react";
import { supabase } from "../../../../supabase/supabase";

interface NavItem {
  icon: JSX.Element;
  label: string;
  href: string;
}

interface SidebarProps {
  activeItem?: string;
}

const Sidebar = ({ activeItem = "Dashboard" }: SidebarProps) => {
  const { signOut, user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchUserCredits();
      fetchRecentAnalyses();
    }
  }, [user]);

  const fetchUserCredits = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("credits")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      setCredits(parseInt(data.credits || "0"));
    } catch (error) {
      console.error("Error fetching credits:", error);
    }
  };

  const fetchRecentAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from("profile_analyses")
        .select("id, name, headline")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(2);

      if (error) throw error;
      setRecentAnalyses(data || []);
    } catch (error) {
      console.error("Error fetching recent analyses:", error);
    }
  };

  const navItems: NavItem[] = [
    {
      icon: <LayoutDashboard size={18} />,
      label: "Dashboard",
      href: "/dashboard",
    },
    {
      icon: <Search size={18} />,
      label: "Profile Analyzer",
      href: "/profile-analyzer",
    },
    {
      icon: <CreditCard size={18} />,
      label: "Subscription",
      href: "/subscription",
    },
  ];

  return (
    <div className="h-screen border-r border-gray-200 w-64 flex flex-col bg-white">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">LinkedIn Analyzer</h2>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          AI-powered profile insights
        </p>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.label}
              variant={item.label === activeItem ? "secondary" : "ghost"}
              className={`w-full justify-start gap-2 text-sm h-10 ${item.label === activeItem ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:text-blue-700"}`}
              asChild
            >
              <Link to={item.href}>
                {item.icon}
                {item.label}
              </Link>
            </Button>
          ))}
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          <h3 className="text-xs font-medium px-3 py-2 text-gray-500">
            Account Summary
          </h3>
          <div className="bg-gray-50 rounded-md p-3 space-y-3">
            <div>
              <p className="text-xs text-gray-500">Available Credits</p>
              <div className="flex items-center justify-between">
                <p className="font-medium">{credits || 0} credits</p>
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200"
                >
                  {credits && credits > 2 ? "Pro" : "Free"}
                </Badge>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full bg-blue-600 hover:bg-blue-700 text-xs h-8"
              asChild
            >
              <Link to="/subscription">Buy More Credits</Link>
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-1">
          <h3 className="text-xs font-medium px-3 py-2 text-gray-500">
            Recent Analyses
          </h3>
          <div className="space-y-1">
            {recentAnalyses.length > 0 ? (
              recentAnalyses.map((analysis, index) => (
                <Button
                  key={analysis.id}
                  variant="ghost"
                  className="w-full justify-start text-sm h-9 text-gray-700 hover:text-blue-700"
                  asChild
                >
                  <Link to={`/profile-analyzer?id=${analysis.id}`}>
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 flex-shrink-0">
                      <span className="text-xs">
                        {analysis.name?.substring(0, 2) || "--"}
                      </span>
                    </div>
                    <div className="truncate text-left">
                      <span>{analysis.name || "LinkedIn Profile"}</span>
                    </div>
                  </Link>
                </Button>
              ))
            ) : (
              <div className="text-sm text-gray-500 px-3 py-2">
                No analyses yet
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-gray-100 space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-sm h-9 text-gray-700 hover:text-blue-700"
          asChild
        >
          <Link to="/settings">
            <Settings size={18} />
            Settings
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-sm h-9 text-gray-700 hover:text-blue-700"
          asChild
        >
          <Link to="/help">
            <HelpCircle size={18} />
            Help & Support
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-sm h-9 text-gray-700 hover:text-blue-700"
          onClick={() => signOut()}
        >
          <LogOut size={18} />
          Log out
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
