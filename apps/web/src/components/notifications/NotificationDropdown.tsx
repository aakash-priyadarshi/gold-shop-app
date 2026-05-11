"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { notificationsApi } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import {
    AlertCircle,
    ArrowRightLeft,
    Ban,
    Bell,
    BrainCircuit,
    Check,
    CheckCheck,
    CheckCircle2,
    DollarSign,
    Hammer,
    Lock,
    MessageSquare,
    Moon,
    Package,
    RotateCcw,
    ShieldAlert,
    ShoppingBag,
    Sparkles,
    TrendingUp,
    Truck,
    UserX,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface Notification {
  id: string;
  type: string;
  titleKey: string;
  titleParams?: Record<string, any>;
  bodyKey: string;
  bodyParams?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  referenceType?: string;
  referenceId?: string;
}

const humanizeToken = (value?: string) => {
  if (!value) return "Notification";
  return value
    .replace(/^notification\./i, "")
    .replace(/\.(title|body)$/i, "")
    .replace(/[_\.]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const inferTypeCategory = (type: string) => {
  if (type.startsWith("ORDER_")) return "ORDER";
  if (type.startsWith("RFQ_") || type.startsWith("OFFER_") || type === "COUNTER_ACCEPTED" || type === "COUNTER_DECLINED") return "QUOTE";
  if (type.startsWith("PAYMENT_") || type.startsWith("REFUND_")) return "PAYMENT";
  if (type.startsWith("PLAN_")) return "SUBSCRIPTION";
  if (type.startsWith("CHAT_") || type.includes("MESSAGE") || type.includes("CONVERSATION")) return "MESSAGING";
  if (type.includes("SUSPEND") || type.includes("VIOLATION") || type.includes("HOLD") || type.includes("ANOMALY")) return "SECURITY";
  if (type === "SELLER_TIER_CHANGE" || type === "WEEKLY_DIGEST" || type === "SHOP_DORMANT_WARNING") return "SELLER";
  if (type === "AI_MILESTONE_REACHED" || type === "QUOTE_ANOMALY_DETECTED") return "AI";
  return "SYSTEM";
};

const fallbackCategoryStyle: Record<string, { icon: any; color: string }> = {
  ORDER: { icon: ShoppingBag, color: "text-blue-500" },
  QUOTE: { icon: MessageSquare, color: "text-purple-500" },
  PAYMENT: { icon: DollarSign, color: "text-green-500" },
  SUBSCRIPTION: { icon: ArrowRightLeft, color: "text-amber-500" },
  MESSAGING: { icon: MessageSquare, color: "text-indigo-500" },
  SECURITY: { icon: ShieldAlert, color: "text-red-600" },
  SELLER: { icon: TrendingUp, color: "text-amber-500" },
  AI: { icon: BrainCircuit, color: "text-violet-500" },
  SYSTEM: { icon: Bell, color: "text-gray-500" },
};

// Notification type configurations
const notificationConfig: Record<
  string,
  {
    icon: any;
    color: string;
    formatTitle: (params?: Record<string, any>) => string;
    formatBody: (params?: Record<string, any>) => string;
  }
> = {
  // Order notifications
  ORDER_PLACED: {
    icon: ShoppingBag,
    color: "text-blue-500",
    formatTitle: (params) => `New Order #${params?.orderNumber || ""}`,
    formatBody: (params) =>
      params?.itemName
        ? `${params.itemName} - ${params.total ? `₹${params.total.toLocaleString()}` : ""}`
        : "A new order has been placed",
  },
  ORDER_CONFIRMED: {
    icon: CheckCircle2,
    color: "text-green-500",
    formatTitle: (params) => `Order Confirmed`,
    formatBody: (params) =>
      `Order #${params?.orderNumber || ""} has been confirmed`,
  },
  ORDER_PACKED: {
    icon: Package,
    color: "text-indigo-500",
    formatTitle: (params) => `Order Packed`,
    formatBody: (params) =>
      `Order #${params?.orderNumber || ""} is packed and ready`,
  },
  ORDER_SHIPPED: {
    icon: Truck,
    color: "text-cyan-500",
    formatTitle: (params) => `Order Shipped`,
    formatBody: (params) => `Order #${params?.orderNumber || ""} is on its way`,
  },
  ORDER_OUT_FOR_DELIVERY: {
    icon: Truck,
    color: "text-blue-600",
    formatTitle: (params) => `Out for Delivery`,
    formatBody: (params) =>
      `Order #${params?.orderNumber || ""} will arrive today`,
  },
  ORDER_DELIVERED: {
    icon: CheckCircle2,
    color: "text-green-600",
    formatTitle: (params) => `Order Delivered`,
    formatBody: (params) =>
      `Order #${params?.orderNumber || ""} has been delivered`,
  },
  ORDER_CANCELLED: {
    icon: AlertCircle,
    color: "text-red-500",
    formatTitle: (params) => `Order Cancelled`,
    formatBody: (params) =>
      `Order #${params?.orderNumber || ""} has been cancelled`,
  },
  ORDER_STATUS_UPDATE: {
    icon: Package,
    color: "text-blue-500",
    formatTitle: (params) => `Order Update`,
    formatBody: (params) =>
      `Order #${params?.orderNumber || ""}: ${params?.status?.replace(/_/g, " ") || "Status updated"}`,
  },
  // RFQ notifications
  RFQ_SENT: {
    icon: MessageSquare,
    color: "text-purple-500",
    formatTitle: () => `Quote Request Sent`,
    formatBody: (params) =>
      params?.shopName
        ? `Sent to ${params.shopName}`
        : "Your request has been sent",
  },
  RFQ_RECEIVED: {
    icon: MessageSquare,
    color: "text-purple-500",
    formatTitle: () => `New Quote Request`,
    formatBody: (params) =>
      params?.customerName
        ? `From ${params.customerName}`
        : "You have a new quote request",
  },
  OFFER_RECEIVED: {
    icon: DollarSign,
    color: "text-amber-500",
    formatTitle: (params) => `New Quote Received`,
    formatBody: (params) =>
      params?.shopName
        ? `${params.shopName} sent a quote`
        : "You have received a new quote",
  },
  OFFER_COUNTERED: {
    icon: DollarSign,
    color: "text-orange-500",
    formatTitle: () => `Counter Offer`,
    formatBody: (params) =>
      params?.amount
        ? `New offer: ₹${params.amount.toLocaleString()}`
        : "A counter offer has been made",
  },
  OFFER_SELECTED: {
    icon: CheckCircle2,
    color: "text-green-500",
    formatTitle: () => `Offer Selected!`,
    formatBody: (params) =>
      params?.orderNumber
        ? `Order #${params.orderNumber} created`
        : "Your offer has been selected",
  },
  // Payment notifications
  PAYMENT_RECEIVED: {
    icon: DollarSign,
    color: "text-green-500",
    formatTitle: () => `Payment Received`,
    formatBody: (params) =>
      params?.amount
        ? `₹${params.amount.toLocaleString()} received`
        : "Payment has been received",
  },
  TICKET_CREATED: {
    icon: MessageSquare,
    color: "text-blue-500",
    formatTitle: (params) =>
      params?.ticketNumber ? `New Ticket #${params.ticketNumber}` : "New Support Ticket",
    formatBody: (params) =>
      params?.subject || params?.message || "A new support ticket needs attention",
  },
  TICKET_UPDATED: {
    icon: MessageSquare,
    color: "text-indigo-500",
    formatTitle: (params) =>
      params?.ticketNumber ? `Ticket #${params.ticketNumber} Updated` : "Ticket Updated",
    formatBody: (params) =>
      params?.status ? `Status changed to ${String(params.status).replace(/_/g, " ")}` : "A support ticket was updated",
  },
  TICKET_MESSAGE: {
    icon: MessageSquare,
    color: "text-blue-600",
    formatTitle: (params) =>
      params?.ticketNumber ? `Reply on Ticket #${params.ticketNumber}` : "New Ticket Reply",
    formatBody: (params) =>
      params?.message || params?.preview || "A new support message was posted",
  },
  TICKET_RESOLVED: {
    icon: CheckCircle2,
    color: "text-green-600",
    formatTitle: (params) =>
      params?.ticketNumber ? `Ticket #${params.ticketNumber} Resolved` : "Ticket Resolved",
    formatBody: () => "The support ticket has been resolved",
  },
  TICKET_CLOSED: {
    icon: Check,
    color: "text-gray-500",
    formatTitle: (params) =>
      params?.ticketNumber ? `Ticket #${params.ticketNumber} Closed` : "Ticket Closed",
    formatBody: () => "The support ticket has been closed",
  },
  // Production notifications
  PRODUCTION_STARTED: {
    icon: Hammer,
    color: "text-indigo-500",
    formatTitle: () => `Production Started`,
    formatBody: (params) =>
      `Order #${params?.orderNumber || ""} is now in production`,
  },
  PRODUCTION_MILESTONE: {
    icon: Hammer,
    color: "text-indigo-500",
    formatTitle: (params) => params?.title || "Production Update",
    formatBody: (params) =>
      `Order #${params?.orderNumber || ""}: ${params?.milestone || "New milestone reached"}`,
  },
  QC_COMPLETED: {
    icon: CheckCircle2,
    color: "text-teal-500",
    formatTitle: () => `Quality Check Complete`,
    formatBody: (params) => `Order #${params?.orderNumber || ""} passed QC`,
  },
  // Booking notifications
  BOOKING_REMINDER: {
    icon: AlertCircle,
    color: "text-amber-500",
    formatTitle: () => `Booking Reminder`,
    formatBody: (params) =>
      params?.expiresIn
        ? `Expires in ${params.expiresIn}`
        : "Your booking is expiring soon",
  },
  BOOKING_EXPIRED: {
    icon: AlertCircle,
    color: "text-red-500",
    formatTitle: () => `Booking Expired`,
    formatBody: (params) =>
      `Order #${params?.orderNumber || ""} booking has expired`,
  },
  // Chat & violation notifications
  CHAT_VIOLATION_WARNING: {
    icon: ShieldAlert,
    color: "text-red-600",
    formatTitle: (params) =>
      params?.strikeCount
        ? `Chat Warning — Strike ${params.strikeCount}/3`
        : "Chat Warning",
    formatBody: (params) =>
      params?.warning ||
      params?.message ||
      "Your message was blocked for a policy violation",
  },
  NEW_MESSAGE: {
    icon: MessageSquare,
    color: "text-blue-500",
    formatTitle: (params) =>
      params?.senderName ? `Message from ${params.senderName}` : "New Message",
    formatBody: (params) =>
      params?.preview || params?.message || "You have a new message",
  },
  CONVERSATION_LOCKED: {
    icon: Lock,
    color: "text-red-500",
    formatTitle: () => "Conversation Locked",
    formatBody: (params) =>
      params?.reason ||
      "A conversation has been locked due to policy violations",
  },
  ACCOUNT_SUSPENDED: {
    icon: UserX,
    color: "text-red-700",
    formatTitle: () => "Account Suspended",
    formatBody: (params) =>
      params?.reason ||
      "Your account has been suspended due to repeated policy violations",
  },
  SHOP_ON_HOLD: {
    icon: Ban,
    color: "text-orange-600",
    formatTitle: (params) =>
      params?.shopName ? `Shop On Hold: ${params.shopName}` : "Shop On Hold",
    formatBody: (params) =>
      params?.reason || "Shop has been placed on hold due to policy violations",
  },
  // Refund notifications
  REFUND_REQUESTED: {
    icon: RotateCcw,
    color: "text-orange-500",
    formatTitle: (params) => `Refund Requested`,
    formatBody: (params) =>
      params?.orderNumber
        ? `Refund requested for Order #${params.orderNumber}`
        : "A refund has been requested",
  },
  REFUND_APPROVED: {
    icon: CheckCircle2,
    color: "text-green-500",
    formatTitle: () => "Refund Approved",
    formatBody: (params) =>
      params?.amount
        ? `₹${params.amount.toLocaleString()} will be refunded`
        : "Your refund has been approved",
  },
  REFUND_REJECTED: {
    icon: AlertCircle,
    color: "text-red-500",
    formatTitle: () => "Refund Rejected",
    formatBody: (params) =>
      params?.reason || "Your refund request has been rejected",
  },
  REFUND_PROCESSED: {
    icon: DollarSign,
    color: "text-green-600",
    formatTitle: () => "Refund Processed",
    formatBody: (params) =>
      params?.amount
        ? `₹${params.amount.toLocaleString()} has been refunded`
        : "Your refund has been processed",
  },
  // Plan Migration notifications
  PLAN_MIGRATION: {
    icon: ArrowRightLeft,
    color: "text-amber-500",
    formatTitle: (params) =>
      params?.oldPlan
        ? `Plan Change: ${params.oldPlan}`
        : "Plan Migration Required",
    formatBody: (params) =>
      params?.newPlan
        ? `Your "${params.oldPlan}" plan is being discontinued. You can migrate to "${params.newPlan}" or downgrade to Free.`
        : "Your current plan is being discontinued. Please review your options.",
  },
  PLAN_MIGRATION_REMINDER: {
    icon: Bell,
    color: "text-amber-600",
    formatTitle: (params) =>
      `Migration Reminder${params?.reminderNumber ? ` #${params.reminderNumber}` : ""}`,
    formatBody: (params) =>
      params?.newPlan
        ? `Please respond to the plan migration for "${params.oldPlan}". Migrate to "${params.newPlan}" or downgrade to Free.`
        : "Please respond to the pending plan migration.",
  },
  PLAN_MIGRATED: {
    icon: CheckCircle2,
    color: "text-green-600",
    formatTitle: (params) =>
      params?.planName ? `Migrated to ${params.planName}` : "Plan Migrated",
    formatBody: (params) =>
      params?.newPlan
        ? `Your shop has been migrated from "${params.oldPlan}" to "${params.newPlan}".`
        : "Your plan has been successfully migrated.",
  },
  PLAN_DOWNGRADED: {
    icon: AlertCircle,
    color: "text-red-500",
    formatTitle: (params) =>
      params?.planName ? `Downgraded to ${params.planName}` : "Plan Downgraded",
    formatBody: (params) =>
      params?.oldPlan
        ? `Your "${params.oldPlan}" plan has ended. You've been moved to "${params.newPlan || "Free Plan"}".`
        : "Your plan has been downgraded.",
  },
  // Seller performance notifications
  SELLER_TIER_CHANGE: {
    icon: TrendingUp,
    color: "text-amber-500",
    formatTitle: (params) =>
      params?.tier ? `Seller Tier: ${params.tier}` : "Seller Tier Updated",
    formatBody: (params) =>
      params?.tier && params?.cap != null
        ? `You are now a ${params.tier} seller. Commission cap: ${params.cap}%.`
        : "Your seller tier has been updated.",
  },
  WEEKLY_DIGEST: {
    icon: TrendingUp,
    color: "text-blue-500",
    formatTitle: (params) =>
      params?.shopName ? `Weekly Report: ${params.shopName}` : "Weekly Shop Report",
    formatBody: (params) => {
      if (params?.weeklyOrders != null)
        return `${params.weeklyOrders} orders this week · Avg rating: ${params.avgRating ?? "—"}`;
      return "Your weekly shop performance digest is ready.";
    },
  },
  SHOP_DORMANT_WARNING: {
    icon: Moon,
    color: "text-orange-400",
    formatTitle: (params) =>
      params?.shopName ? `Inactive Shop: ${params.shopName}` : "Shop Inactive",
    formatBody: () =>
      "No orders or quotes in the last 14 days. Keep your shop active!",
  },
  // AI / Admin notifications
  AI_MILESTONE_REACHED: {
    icon: Sparkles,
    color: "text-violet-500",
    formatTitle: (params) =>
      params?.milestone ? `Milestone: ${params.milestone}` : "AI Milestone Reached",
    formatBody: (params) =>
      params?.description
        ? String(params.description)
        : "A marketplace AI milestone has been reached.",
  },
  QUOTE_ANOMALY_DETECTED: {
    icon: BrainCircuit,
    color: "text-red-500",
    formatTitle: (params) =>
      params?.count ? `${params.count} Quote Anomalies Detected` : "Quote Anomaly Alert",
    formatBody: (params) =>
      params?.count
        ? `${params.count} unusual quote pattern${params.count > 1 ? "s" : ""} detected. Review in the admin panel.`
        : "Unusual quote patterns detected. Review in the admin panel.",
  },
  // RFQ expiry
  RFQ_EXPIRED: {
    icon: AlertCircle,
    color: "text-orange-500",
    formatTitle: () => "Quote Request Expired",
    formatBody: (params) =>
      params?.rfqNumber
        ? `RFQ #${params.rfqNumber} has expired without a confirmed offer.`
        : "Your quote request has expired without a confirmed offer.",
  },
  // Counter-offer outcomes
  COUNTER_ACCEPTED: {
    icon: CheckCircle2,
    color: "text-green-600",
    formatTitle: (params) =>
      params?.orderNumber ? `Counter Offer Accepted — #${params.orderNumber}` : "Counter Offer Accepted",
    formatBody: (params) =>
      params?.orderNumber
        ? `Order #${params.orderNumber} has been confirmed.`
        : "Your counter offer was accepted.",
  },
  COUNTER_DECLINED: {
    icon: AlertCircle,
    color: "text-red-500",
    formatTitle: (params) =>
      params?.orderNumber ? `Counter Offer Declined — #${params.orderNumber}` : "Counter Offer Declined",
    formatBody: (params) =>
      params?.reason
        ? String(params.reason)
        : "The customer declined your counter offer.",
  },
  // System notifications (fallback)
  SYSTEM_ALERT: {
    icon: AlertCircle,
    color: "text-gray-500",
    formatTitle: (params) =>
      params?.title || (params?.orderNumber ? `Order #${params.orderNumber}` : "System Alert"),
    formatBody: (params) => {
      if (params?.message) return String(params.message);
      if (params?.status)
        return `Status updated to ${params.status.replace(/_/g, " ")}`;
      if (params?.itemName)
        return `${params.itemName}${params.total ? ` - ₹${params.total.toLocaleString()}` : ""}`;
      return "Important notification";
    },
  },
};

function buildFallbackTitle(notification: Notification, params: Record<string, any>) {
  if (params?.title) return String(params.title);
  if (params?.orderNumber) return `Order #${params.orderNumber}`;
  if (params?.rfqNumber) return `RFQ #${params.rfqNumber}`;
  if (params?.quoteNumber) return `Quote #${params.quoteNumber}`;
  if (notification.titleKey) return humanizeToken(notification.titleKey);
  return humanizeToken(notification.type);
}

function buildFallbackBody(notification: Notification, params: Record<string, any>) {
  if (params?.message) return String(params.message);
  if (params?.reason) return String(params.reason);
  if (params?.status) return `Status: ${String(params.status).replace(/_/g, " ")}`;
  if (params?.shopName && params?.customerName) {
    return `${params.customerName} - ${params.shopName}`;
  }
  if (params?.shopName) return `Shop: ${params.shopName}`;
  if (params?.newPlan) return `Updated to ${params.newPlan}`;
  if (notification.bodyKey) return humanizeToken(notification.bodyKey);
  return "You have a new notification.";
}

export function NotificationDropdown() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const seenNotificationIds = useRef<Set<string>>(new Set());
  const hasLoadedNotifications = useRef(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const [notifRes, countRes] = await Promise.all([
        notificationsApi.getAll({ unreadOnly: false }),
        notificationsApi.getUnreadCount(),
      ]);
      const nextNotifications: Notification[] = notifRes.data || [];
      const freshUnread = nextNotifications.filter(
        (notification) =>
          !notification.isRead && !seenNotificationIds.current.has(notification.id),
      );
      nextNotifications.forEach((notification) => seenNotificationIds.current.add(notification.id));

      if (hasLoadedNotifications.current && freshUnread.length > 0) {
        freshUnread.slice(0, 3).forEach((notification) => {
          const content = getNotificationContent(notification);
          toast({ title: content.title, description: content.body });
        });
      }

      hasLoadedNotifications.current = true;
      setNotifications(nextNotifications);
      setUnreadCount(countRes.data?.count || 0);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  useEffect(() => {
    if (!user) {
      // Clear stale state immediately on logout so the next logged-in
      // user never briefly sees the previous user's notifications.
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    fetchNotifications();
    const handleNotificationRefresh = () => fetchNotifications();
    window.addEventListener("orivraa:notifications-refresh", handleNotificationRefresh);
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => {
      window.removeEventListener("orivraa:notifications-refresh", handleNotificationRefresh);
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const getNotificationContent = (notification: Notification) => {
    const config = notificationConfig[notification.type];
    // Merge titleParams and bodyParams for flexibility
    const allParams = {
      ...notification.titleParams,
      ...notification.bodyParams,
    };

    if (!config) {
      const category = inferTypeCategory(notification.type);
      const style = fallbackCategoryStyle[category] || fallbackCategoryStyle.SYSTEM;
      return {
        icon: style.icon,
        color: style.color,
        title: buildFallbackTitle(notification, allParams),
        body: buildFallbackBody(notification, allParams),
      };
    }

    return {
      icon: config.icon,
      color: config.color,
      title: config.formatTitle(allParams),
      body: config.formatBody(allParams),
    };
  };

  const getNotificationLink = (notification: Notification) => {
    if (!notification.referenceType || !notification.referenceId) return null;

    const referenceType = notification.referenceType.toUpperCase();
    const isShopkeeper = user?.role === "SHOPKEEPER";
    const isAdmin = user?.role === "ADMIN";
    const isTestReference = notification.referenceId.startsWith("test-");

    switch (referenceType) {
      case "ORDER":
        if (isTestReference) {
          return isShopkeeper ? "/dashboard/shop/orders" : "/dashboard/customer/orders";
        }
        return isShopkeeper
          ? `/dashboard/shop/orders/${notification.referenceId}`
          : `/dashboard/customer/orders/${notification.referenceId}`;
      case "RFQ":
        if (isTestReference) {
          return isShopkeeper ? "/dashboard/shop/rfqs" : "/dashboard/customer/rfqs";
        }
        return isShopkeeper
          ? `/dashboard/shop/rfqs/${notification.referenceId}`
          : `/dashboard/customer/rfqs/${notification.referenceId}`;
      case "TICKET":
        return isAdmin
          ? "/dashboard/admin/tickets"
          : isShopkeeper
            ? `/dashboard/shop/support`
            : `/dashboard/customer/support`;
      case "PAYMENT":
        return isShopkeeper ? "/dashboard/shop/billing" : "/dashboard/customer/orders";
      case "AI_CHAT":
        return isAdmin ? "/dashboard/admin/messages?view=ai" : null;
      case "SHOP":
        return `/dashboard/shop`;
      case "CONVERSATION":
        return isShopkeeper
          ? `/dashboard/shop/messages`
          : isAdmin
            ? `/dashboard/admin/messages`
            : `/dashboard/customer/messages`;
      case "USER":
        return isAdmin
          ? `/dashboard/admin/users?id=${notification.referenceId}`
          : null;
      default:
        return null;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.slice(0, 10).map((notification) => {
              const {
                icon: Icon,
                color,
                title,
                body,
              } = getNotificationContent(notification);
              const link = getNotificationLink(notification);

              const content = (
                <div
                  className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    !notification.isRead
                      ? "bg-blue-50/50 dark:bg-blue-950/30"
                      : ""
                  }`}
                  onClick={() =>
                    !notification.isRead && handleMarkAsRead(notification.id)
                  }
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 ${color}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {body}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );

              return link ? (
                <Link key={notification.id} href={link}>
                  {content}
                </Link>
              ) : (
                <div key={notification.id}>{content}</div>
              );
            })
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link
                href="/notifications"
                className="w-full text-center text-sm"
              >
                View all notifications
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
