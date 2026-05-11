"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { notificationsApi } from "@/lib/api";
import {
    Bell,
    Bot,
    CreditCard,
    HelpCircle,
    Loader2,
    MessageSquare,
    RefreshCw,
    ShieldAlert,
    ShoppingBag,
    Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface NotificationScenario {
  id: string;
  label: string;
  description: string;
  targetRole: "ADMIN" | "SHOPKEEPER";
  type: string;
}

const scenarioIcons: Record<string, any> = {
  NEW_MESSAGE: MessageSquare,
  ORDER_PLACED: ShoppingBag,
  RFQ_RECEIVED: HelpCircle,
  PAYMENT_RECEIVED: CreditCard,
  TICKET_MESSAGE: MessageSquare,
  SYSTEM_ALERT: ShieldAlert,
};

const fallbackScenarios: NotificationScenario[] = [
  {
    id: "admin_ai_escalation",
    label: "AI chat needs human follow-up",
    description: "Admin alert when the AI assistant escalates a visitor/shopkeeper conversation.",
    targetRole: "ADMIN",
    type: "SYSTEM_ALERT",
  },
  {
    id: "admin_policy_alert",
    label: "Chat policy alert",
    description: "Admin alert for contact-sharing or unsafe chat behaviour.",
    targetRole: "ADMIN",
    type: "SYSTEM_ALERT",
  },
  {
    id: "shop_new_message",
    label: "New customer message",
    description: "Shopkeeper notification for an incoming buyer/support message.",
    targetRole: "SHOPKEEPER",
    type: "NEW_MESSAGE",
  },
  {
    id: "shop_new_order",
    label: "New order placed",
    description: "Shopkeeper notification for a newly placed order.",
    targetRole: "SHOPKEEPER",
    type: "ORDER_PLACED",
  },
  {
    id: "shop_payment_received",
    label: "Payment received",
    description: "Shopkeeper notification for booking/order payment confirmation.",
    targetRole: "SHOPKEEPER",
    type: "PAYMENT_RECEIVED",
  },
  {
    id: "shop_rfq_received",
    label: "New RFQ received",
    description: "Shopkeeper notification for a customer quote request.",
    targetRole: "SHOPKEEPER",
    type: "RFQ_RECEIVED",
  },
  {
    id: "shop_ticket_message",
    label: "Support ticket reply",
    description: "Shopkeeper notification when support/admin replies to a ticket.",
    targetRole: "SHOPKEEPER",
    type: "TICKET_MESSAGE",
  },
];

function getRecipientName(recipient: any) {
  if (!recipient) return "recipient";
  const name = `${recipient.firstName ?? ""} ${recipient.lastName ?? ""}`.trim();
  return name || recipient.email || "recipient";
}

export default function AdminNotificationTestingPage() {
  const { toast } = useToast();
  const [scenarios, setScenarios] = useState<NotificationScenario[]>(fallbackScenarios);
  const [loading, setLoading] = useState(true);
  const [sendingScenario, setSendingScenario] = useState<string | null>(null);

  const groupedScenarios = useMemo(
    () => ({
      admin: scenarios.filter((scenario) => scenario.targetRole === "ADMIN"),
      shopkeeper: scenarios.filter((scenario) => scenario.targetRole === "SHOPKEEPER"),
    }),
    [scenarios],
  );

  async function loadScenarios() {
    setLoading(true);
    try {
      const res = await notificationsApi.getTestScenarios();
      if (Array.isArray(res.data) && res.data.length > 0) {
        setScenarios(res.data);
      }
    } catch (error) {
      console.error("Failed to load notification scenarios", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadScenarios();
  }, []);

  async function sendScenario(scenario: NotificationScenario) {
    setSendingScenario(scenario.id);
    try {
      const res = await notificationsApi.sendTest({
        scenario: scenario.id,
        targetRole: scenario.targetRole,
      });
      const recipient = res.data?.recipient;
      toast({
        title: scenario.label,
        description: `Test notification sent to ${getRecipientName(recipient)} (${scenario.targetRole.toLowerCase()}).`,
      });
      window.dispatchEvent(new Event("orivraa:notifications-refresh"));
    } catch (error: any) {
      toast({
        title: "Notification test failed",
        description: error?.response?.data?.message || "Could not send the test notification.",
        variant: "destructive",
      });
    } finally {
      setSendingScenario(null);
    }
  }

  function renderScenario(scenario: NotificationScenario) {
    const Icon = scenarioIcons[scenario.type] ?? Bell;
    const sending = sendingScenario === scenario.id;

    return (
      <Card key={scenario.id} className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-muted p-2 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">{scenario.label}</CardTitle>
                <CardDescription className="mt-1">{scenario.description}</CardDescription>
              </div>
            </div>
            <Badge variant={scenario.targetRole === "ADMIN" ? "default" : "secondary"}>
              {scenario.targetRole.toLowerCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Button className="w-full gap-2" onClick={() => sendScenario(scenario)} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Trigger Test Notification
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Notification Tests</h1>
                <p className="text-sm text-muted-foreground">
                  Trigger admin and shopkeeper notification flows from one controlled admin console.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadScenarios} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh Scenarios
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Admin Flows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-2xl font-bold">
                  <ShieldAlert className="h-5 w-5 text-primary" /> {groupedScenarios.admin.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Shopkeeper Flows</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-2xl font-bold">
                  <ShoppingBag className="h-5 w-5 text-primary" /> {groupedScenarios.shopkeeper.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Popup Check</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Bot className="h-5 w-5 text-primary" /> Admin-target tests refresh the bell instantly.
                </div>
              </CardContent>
            </Card>
          </div>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Admin notifications</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {groupedScenarios.admin.map(renderScenario)}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Shopkeeper notifications</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {groupedScenarios.shopkeeper.map(renderScenario)}
            </div>
          </section>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}