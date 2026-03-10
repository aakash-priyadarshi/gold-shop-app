"use client";

import { useEffect, useState } from "react";
import {
  Users,
  ListTodo,
  Bot,
  Award,
  Star,
  HeadphonesIcon,
  TrendingUp,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { employeeApi, taskApi, supportApi, reviewApi } from "@/lib/api";

interface DashStats {
  employees: number;
  activeTasks: number;
  openTickets: number;
  avgRating: number;
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [stats, setStats] = useState<DashStats>({
    employees: 0,
    activeTasks: 0,
    openTickets: 0,
    avgRating: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.allSettled([
      employeeApi.list(),
      taskApi.list({ status: "IN_PROGRESS" }),
      supportApi.getDashboard(),
      reviewApi.getDashboard(),
    ]).then(([empRes, taskRes, supportRes, reviewRes]) => {
      setStats({
        employees: empRes.status === "fulfilled" ? (empRes.value.data?.length ?? empRes.value.data?.total ?? 0) : 0,
        activeTasks: taskRes.status === "fulfilled" ? (taskRes.value.data?.length ?? taskRes.value.data?.total ?? 0) : 0,
        openTickets: supportRes.status === "fulfilled" ? (supportRes.value.data?.openTickets ?? 0) : 0,
        avgRating: reviewRes.status === "fulfilled" ? (reviewRes.value.data?.averageRating ?? 0) : 0,
      });
      setLoading(false);
    });
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <h1 className="text-2xl font-bold">Welcome to Orivraa Team Ops</h1>
        <p className="text-muted-foreground">
          Login from the main Orivraa app to access the team dashboard.
        </p>
        <p className="text-sm text-muted-foreground">
          Your token from <strong>orivraa.com</strong> is shared with this app.
        </p>
      </div>
    );
  }

  const cards = [
    { title: "Total Employees", value: stats.employees, icon: Users, color: "text-blue-500" },
    { title: "Active Tasks", value: stats.activeTasks, icon: ListTodo, color: "text-amber-500" },
    { title: "Open Tickets", value: stats.openTickets, icon: HeadphonesIcon, color: "text-purple-500" },
    { title: "Avg Rating", value: stats.avgRating ? stats.avgRating.toFixed(1) : "—", icon: Star, color: "text-gold-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.firstName}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your team operations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                ) : (
                  card.value
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {[
              { label: "Add Employee", href: "/employees", icon: Users },
              { label: "Create Task", href: "/tasks", icon: ListTodo },
              { label: "View Leads", href: "/ai-sales", icon: Bot },
              { label: "Issue Certificate", href: "/certificates", icon: Award },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-accent transition-colors"
              >
                <action.icon className="h-4 w-4 text-gold-500" />
                {action.label}
              </a>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Team API", status: "Operational" },
              { label: "Database", status: "Connected" },
              { label: "AI Sales Engine", status: "Ready" },
              { label: "Certificate Issuer", status: "Active" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span>{item.label}</span>
                <span className="flex items-center gap-1.5 text-emerald-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {item.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
