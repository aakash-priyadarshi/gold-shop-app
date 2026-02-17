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
import { useAuth } from "@/hooks/useAuth";
import { notificationsApi } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Ban,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  DollarSign,
  Hammer,
  Lock,
  MessageSquare,
  Package,
  RotateCcw,
  ShieldAlert,
  ShoppingBag,
  Truck,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

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
  // System notifications (fallback)
  SYSTEM_ALERT: {
    icon: AlertCircle,
    color: "text-gray-500",
    formatTitle: (params) =>
      params?.orderNumber ? `Order #${params.orderNumber}` : "System Alert",
    formatBody: (params) => {
      if (params?.status)
        return `Status updated to ${params.status.replace(/_/g, " ")}`;
      if (params?.itemName)
        return `${params.itemName}${params.total ? ` - ₹${params.total.toLocaleString()}` : ""}`;
      return "Important notification";
    },
  },
};

export function NotificationDropdown() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const [notifRes, countRes] = await Promise.all([
        notificationsApi.getAll({ unreadOnly: false }),
        notificationsApi.getUnreadCount(),
      ]);
      setNotifications(notifRes.data || []);
      setUnreadCount(countRes.data?.count || 0);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
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
    const config =
      notificationConfig[notification.type] || notificationConfig.SYSTEM_ALERT;
    // Merge titleParams and bodyParams for flexibility
    const allParams = {
      ...notification.titleParams,
      ...notification.bodyParams,
    };
    return {
      icon: config.icon,
      color: config.color,
      title: config.formatTitle(allParams),
      body: config.formatBody(allParams),
    };
  };

  const getNotificationLink = (notification: Notification) => {
    if (!notification.referenceType || !notification.referenceId) return null;

    const isShopkeeper = user?.role === "SHOPKEEPER";

    switch (notification.referenceType) {
      case "ORDER":
        return isShopkeeper
          ? `/dashboard/shop/orders/${notification.referenceId}`
          : `/dashboard/customer/orders/${notification.referenceId}`;
      case "RFQ":
        return isShopkeeper
          ? `/dashboard/shop/rfq/${notification.referenceId}`
          : `/dashboard/customer/rfqs/${notification.referenceId}`;
      case "SHOP":
        return `/dashboard/shop`;
      case "Conversation":
        return isShopkeeper
          ? `/dashboard/shop/messages`
          : user?.role === "ADMIN"
            ? `/dashboard/admin/chat-monitoring`
            : `/dashboard/customer/messages`;
      case "User":
        return user?.role === "ADMIN"
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
