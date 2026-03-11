"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  Building2,
  ChevronLeft,
  Disc,
  FileText,
  FlaskConical,
  HeadphonesIcon,
  LayoutDashboard,
  Lightbulb,
  ListTodo,
  LogOut,
  Megaphone,
  Menu,
  Mic,
  Phone,
  Play,
  Settings,
  Share2,
  Shield,
  Star,
  Timer,
  UserCircle,
  Users,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/departments", label: "Departments", icon: Building2 },
  { href: "/roles", label: "Roles & Permissions", icon: Shield },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  {
    href: "/ai-sales",
    label: "AI Sales",
    icon: Bot,
    subItems: [
      { href: "/ai-sales/personas", label: "Sales Agents", icon: Mic },
      { href: "/ai-sales/leads", label: "Leads", icon: Users },
      { href: "/ai-sales/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/ai-sales/calls", label: "Calls", icon: Phone },
      { href: "/ai-sales/scripts", label: "Scripts", icon: FileText },
      { href: "/ai-sales/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/ai-sales/memory", label: "Agent Memory", icon: Brain },
      { href: "/ai-sales/intelligence", label: "Intelligence", icon: Lightbulb },
      { href: "/ai-sales/experiments", label: "A/B Testing", icon: FlaskConical },
      { href: "/ai-sales/follow-ups", label: "Follow-Ups", icon: Timer },
      { href: "/ai-sales/playbook", label: "Objection Playbook", icon: BookOpen },
      { href: "/ai-sales/recordings", label: "Recordings", icon: Disc },
      { href: "/ai-sales/live-sentiment", label: "Live Sentiment", icon: Activity },
      { href: "/ai-sales/webhooks", label: "Webhooks", icon: Zap },
      { href: "/ai-sales/playground", label: "Playground", icon: Play },
    ],
  },
  { href: "/certificates", label: "Certificates", icon: Award },
  { href: "/social", label: "Social Media", icon: Share2 },
  { href: "/reviews", label: "Reviews", icon: Star },
  { href: "/support", label: "Support", icon: HeadphonesIcon },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex h-16 items-center border-b px-4",
            collapsed && "justify-center",
          )}
        >
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500 text-white font-bold text-sm">
                O
              </div>
              <span className="font-bold text-lg">Team Ops</span>
            </Link>
          )}
          {collapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-500 text-white font-bold text-sm">
              O
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const hasSubItems = "subItems" in item && item.subItems;
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-gold-500/10 text-gold-600 dark:text-gold-400"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    collapsed && "justify-center px-2",
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
                {hasSubItems && isActive && !collapsed && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l pl-3">
                    {item.subItems!.map((sub) => {
                      const subActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                            subActive
                              ? "bg-gold-500/10 text-gold-600 dark:text-gold-400"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                          )}
                        >
                          <sub.icon className="h-3.5 w-3.5 shrink-0" />
                          <span>{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-2 space-y-1">
          {!collapsed && user && (
            <div className="px-3 py-2 text-xs text-muted-foreground truncate">
              {user.email}
              <span className="block text-[10px] opacity-60">{user.role}</span>
            </div>
          )}
          <button
            onClick={logout}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors",
              collapsed && "justify-center px-2",
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>

          {/* Collapse toggle (desktop only) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                collapsed && "rotate-180",
              )}
            />
            {!collapsed && <span className="text-xs">Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
