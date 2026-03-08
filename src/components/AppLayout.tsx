import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  FlaskConical,
  Pill,
  Receipt,
  BedDouble,
  FileText,
  Settings,
  LogOut,
  Activity,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: ReactNode;
  path: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: <LayoutDashboard size={20} />, path: "/" },
  { label: "Patients", icon: <Users size={20} />, path: "/patients" },
  { label: "Consultations", icon: <Stethoscope size={20} />, path: "/consultations" },
  { label: "Laboratory", icon: <FlaskConical size={20} />, path: "/laboratory" },
  { label: "Pharmacy", icon: <Pill size={20} />, path: "/pharmacy" },
  { label: "Billing", icon: <Receipt size={20} />, path: "/billing" },
  { label: "Inpatient", icon: <BedDouble size={20} />, path: "/inpatient" },
  { label: "Reports", icon: <FileText size={20} />, path: "/reports" },
];

const bottomNavItems: NavItem[] = [
  { label: "Settings", icon: <Settings size={20} />, path: "/settings" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, department")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
            <Activity size={20} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-base font-bold text-sidebar-primary-foreground">AfyaBora</h1>
            <p className="text-[11px] text-sidebar-foreground/60">Hospital Management</p>
          </div>
          <button
            className="ml-auto lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Main Menu
          </p>
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom nav */}
        <div className="border-t border-sidebar-border px-3 py-3 space-y-1">
          {bottomNavItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
          <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:px-8">
          <button
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{profile?.full_name ?? user?.email ?? "User"}</p>
              <p className="text-xs text-muted-foreground">{profile?.department ?? "Staff"}</p>
            </div>
            <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-sm font-semibold text-primary-foreground">
              {(profile?.full_name ?? user?.email ?? "U").slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
