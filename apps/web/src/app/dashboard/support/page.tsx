"use client";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { supportApi, ticketsApi } from "@/lib/api";
import { Loader2, ShieldAlert, Ticket } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SupportDashboardPage() {
  const [dashStats, setDashStats] = useState<any>(null);
  const [ticketStats, setTicketStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supportApi.getDashboard().then((r) => setDashStats(r.data)),
      ticketsApi.getStats().then((r) => setTicketStats(r.data)),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Support Dashboard</h1>

        {/* Ticket stats */}
        {ticketStats && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Ticket className="h-5 w-5" /> Tickets
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <StatCard
                label="Open"
                value={ticketStats.open}
                color="text-blue-600"
                href="/dashboard/support/tickets"
              />
              <StatCard
                label="Claimed"
                value={ticketStats.claimed}
                color="text-yellow-600"
                href="/dashboard/support/tickets"
              />
              <StatCard
                label="In Progress"
                value={ticketStats.inProgress}
                color="text-purple-600"
                href="/dashboard/support/tickets"
              />
              <StatCard
                label="Waiting User"
                value={ticketStats.waitingUser}
                color="text-orange-600"
                href="/dashboard/support/tickets"
              />
              <StatCard
                label="Resolved"
                value={ticketStats.resolved}
                color="text-green-600"
                href="/dashboard/support/tickets"
              />
              <StatCard
                label="Total"
                value={ticketStats.total}
                color="text-gray-600"
                href="/dashboard/support/tickets"
              />
            </div>
          </div>
        )}

        {/* General support stats */}
        {dashStats && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> Platform Overview
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatCard
                label="Pending Refunds"
                value={dashStats.pendingRefunds}
                color="text-red-600"
              />
              <StatCard
                label="Total Orders"
                value={dashStats.totalOrders}
                color="text-gray-600"
              />
              <StatCard
                label="Active Chats"
                value={dashStats.activeConversations}
                color="text-green-600"
              />
              <StatCard
                label="Locked Chats"
                value={dashStats.lockedConversations}
                color="text-red-600"
              />
              <StatCard
                label="Recent Violations"
                value={dashStats.recentViolations}
                color="text-orange-600"
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  label,
  value,
  color,
  href,
}: {
  label: string;
  value: number;
  color: string;
  href?: string;
}) {
  const content = (
    <Card
      className={`p-3 ${href ? "hover:bg-accent/50 transition-colors cursor-pointer" : ""}`}
    >
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
