"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { T } from "@/components/ui/T";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { useT } from "@/providers/translation-provider";
import {
  BellIcon,
  CheckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Notification {
  id: string;
  type: "ORDER" | "RFQ" | "OFFER" | "SYSTEM" | "PROMOTION" | "ALERT";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "ORDER":
      return ShoppingBagIcon;
    case "RFQ":
    case "OFFER":
      return DocumentTextIcon;
    case "PROMOTION":
      return SparklesIcon;
    case "ALERT":
      return ExclamationTriangleIcon;
    case "SYSTEM":
    default:
      return InformationCircleIcon;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case "ORDER":
      return "bg-blue-100 text-blue-600";
    case "RFQ":
    case "OFFER":
      return "bg-purple-100 text-purple-600";
    case "PROMOTION":
      return "bg-amber-100 text-amber-600";
    case "ALERT":
      return "bg-red-100 text-red-600";
    case "SYSTEM":
    default:
      return "bg-gray-100 text-gray-600";
  }
};

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const t = useT();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login?redirect=/notifications");
      return;
    }
    if (isAuthenticated) {
      loadNotifications();
    }
  }, [isAuthenticated, authLoading]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/notifications");
      setNotifications(response.data?.notifications || response.data || []);
    } catch (error) {
      console.error("Failed to load notifications:", error);
      // Set demo notifications for now
      setNotifications([
        {
          id: "1",
          type: "ORDER",
          title: "Order Confirmed",
          message: "Your order #ORD-001 has been confirmed by the seller.",
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: "2",
          type: "RFQ",
          title: "New Quote Received",
          message:
            "You have received a new quote for your custom ring request.",
          isRead: false,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: "3",
          type: "PROMOTION",
          title: "Special Offer",
          message: "Get 10% off on all gold jewelry this weekend!",
          isRead: true,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !n.isRead;
    return n.type === activeTab.toUpperCase();
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("Just now");
    if (diffMins < 60) return `${diffMins}${t("m ago")}`;
    if (diffHours < 24) return `${diffHours}${t("h ago")}`;
    if (diffDays < 7) return `${diffDays}${t("d ago")}`;
    return date.toLocaleDateString();
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BellIcon className="h-6 w-6" />
              <T>Notifications</T>
            </h1>
            <p className="text-gray-500 mt-1">
              {unreadCount > 0
                ? `${unreadCount} ${t("unread")}`
                : t("All caught up!")}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckIcon className="h-4 w-4 mr-2" />
              <T>Mark all as read</T>
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              <T>All</T>
            </TabsTrigger>
            <TabsTrigger value="unread">
              <T>Unread</T>
              {unreadCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 bg-red-500 text-white"
                >
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="order">
              <T>Orders</T>
            </TabsTrigger>
            <TabsTrigger value="rfq">
              <T>Quotes</T>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BellIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">
                    <T>No notifications</T>
                  </h3>
                  <p className="text-gray-500 mt-1">
                    {activeTab === "unread"
                      ? t("You're all caught up!")
                      : t("No notifications to display")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredNotifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);
                  return (
                    <Card
                      key={notification.id}
                      className={`transition-colors ${!notification.isRead ? "bg-amber-50/50 border-amber-200" : ""}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-lg ${getNotificationColor(notification.type)}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4
                                  className={`text-sm font-medium ${!notification.isRead ? "text-gray-900" : "text-gray-700"}`}
                                >
                                  {notification.title}
                                </h4>
                                <p className="text-sm text-gray-500 mt-0.5">
                                  {notification.message}
                                </p>
                              </div>
                              <span className="text-xs text-gray-400 whitespace-nowrap">
                                {formatTime(notification.createdAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  <CheckIcon className="h-3 w-3 mr-1" />
                                  <T>Mark as read</T>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() =>
                                  deleteNotification(notification.id)
                                }
                              >
                                <TrashIcon className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
