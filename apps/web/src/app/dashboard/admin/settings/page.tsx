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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlagImage, type FlagCode } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { adminApi } from "@/lib/api";
import {
  Bell,
  CheckCircle2,
  Database,
  DollarSign,
  Globe,
  KeyRound,
  Loader2,
  Mail,
  Percent,
  RefreshCw,
  Send,
  Settings,
  Shield,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

const supportedRegions = [
  { code: "NP", name: "Nepal", currency: "NPR" },
  { code: "IN", name: "India", currency: "INR" },
  { code: "US", name: "United States", currency: "USD" },
  { code: "UK", name: "United Kingdom", currency: "GBP" },
  { code: "AE", name: "UAE", currency: "AED" },
  { code: "EU", name: "European Union", currency: "EUR" },
];

const supportedCurrencies = ["NPR", "INR", "USD", "GBP", "AED", "EUR"];

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [refreshingRates, setRefreshingRates] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [notificationData, setNotificationData] = useState({
    title: "",
    message: "",
    type: "INFO",
    targetRoles: [] as string[],
  });

  // Email settings state
  const [emailStatus, setEmailStatus] = useState<{
    configured: boolean;
    sender: string;
  } | null>(null);
  const [loadingEmailStatus, setLoadingEmailStatus] = useState(true);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [adminEmailForm, setAdminEmailForm] = useState({
    newEmail: "",
    currentPassword: "",
  });
  const [updatingAdminEmail, setUpdatingAdminEmail] = useState(false);

  // Fetch email status on mount
  useEffect(() => {
    const fetchEmailStatus = async () => {
      try {
        const response = await adminApi.getEmailStatus();
        setEmailStatus(response.data);
      } catch (error) {
        console.error("Failed to fetch email status:", error);
      } finally {
        setLoadingEmailStatus(false);
      }
    };
    fetchEmailStatus();
  }, []);

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter an email address to send the test to.",
      });
      return;
    }

    setSendingTestEmail(true);
    try {
      await adminApi.sendTestEmail(testEmail);
      toast({
        title: "Test Email Sent",
        description: `Test email has been sent to ${testEmail}. Check your inbox.`,
      });
      setTestEmail("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Send Failed",
        description: "Could not send test email. Check SMTP configuration.",
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleUpdateAdminEmail = async () => {
    if (!adminEmailForm.newEmail || !adminEmailForm.currentPassword) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please fill in all fields.",
      });
      return;
    }

    setUpdatingAdminEmail(true);
    try {
      await adminApi.updateAdminEmail({
        email: adminEmailForm.newEmail,
        currentPassword: adminEmailForm.currentPassword,
      });
      toast({
        title: "Admin Email Updated",
        description: `Admin notification email has been updated to ${adminEmailForm.newEmail}.`,
      });
      setEmailDialogOpen(false);
      setAdminEmailForm({ newEmail: "", currentPassword: "" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description:
          error?.response?.data?.message ||
          "Could not update admin email. Check your password.",
      });
    } finally {
      setUpdatingAdminEmail(false);
    }
  };

  const handleRefreshRates = async () => {
    setRefreshingRates(true);
    try {
      await adminApi.refreshMarketRates();
      toast({
        title: "Market Rates Refreshed",
        description: "Latest market rates have been fetched successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: "Could not refresh market rates. Try again later.",
      });
    } finally {
      setRefreshingRates(false);
    }
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      await adminApi.clearCache();
      toast({
        title: "Cache Cleared",
        description: "Platform cache has been cleared successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Clear Failed",
        description: "Could not clear cache. Try again later.",
      });
    } finally {
      setClearingCache(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notificationData.title || !notificationData.message) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please fill in title and message.",
      });
      return;
    }

    setSendingNotification(true);
    try {
      await adminApi.broadcastNotification(notificationData);
      toast({
        title: "Notification Sent",
        description: "System notification has been broadcasted.",
      });
      setNotificationDialogOpen(false);
      setNotificationData({
        title: "",
        message: "",
        type: "INFO",
        targetRoles: [],
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Send Failed",
        description: "Could not send notification. Try again later.",
      });
    } finally {
      setSendingNotification(false);
    }
  };

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Platform Settings</h1>
            <p className="text-muted-foreground">
              Configure platform-wide settings and defaults
            </p>
          </div>

          <div className="grid gap-6">
            {/* Platform Fee */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Platform Commission
                </CardTitle>
                <CardDescription>
                  Default commission rate charged on transactions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="platformFee">Commission Rate (%)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="platformFee"
                        type="number"
                        value="1"
                        disabled
                        className="w-24"
                      />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Platform earns 1% on each successful transaction. This
                      setting is currently read-only.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Supported Regions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Supported Regions
                </CardTitle>
                <CardDescription>
                  Countries where the platform operates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {supportedRegions.map((region) => (
                    <div
                      key={region.code}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <FlagImage code={region.code as FlagCode} size={28} />
                      <div>
                        <p className="font-medium">{region.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {region.code} • {region.currency}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Supported Currencies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Supported Currencies
                </CardTitle>
                <CardDescription>
                  Currencies available for transactions and display
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {supportedCurrencies.map((currency) => (
                    <Badge
                      key={currency}
                      variant="outline"
                      className="text-sm py-1 px-3"
                    >
                      {currency}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Defaults */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Defaults
                </CardTitle>
                <CardDescription>
                  Default values used across the platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Default Making Charge</Label>
                    <div className="flex items-center gap-2">
                      <Input value="10" disabled className="w-24" />
                      <span className="text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Applied when shop hasn't set custom rates
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Margin</Label>
                    <div className="flex items-center gap-2">
                      <Input value="2" disabled className="w-24" />
                      <span className="text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Default shop margin on metal price
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Market Rate Cache TTL</Label>
                    <div className="flex items-center gap-2">
                      <Input value="5" disabled className="w-24" />
                      <span className="text-muted-foreground">minutes</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      How long market rates are cached
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>FX Rate Cache TTL</Label>
                    <div className="flex items-center gap-2">
                      <Input value="60" disabled className="w-24" />
                      <span className="text-muted-foreground">minutes</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      How long FX rates are cached
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Authentication and security configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Access Token Expiry</Label>
                    <div className="flex items-center gap-2">
                      <Input value="15" disabled className="w-24" />
                      <span className="text-muted-foreground">minutes</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Refresh Token Expiry</Label>
                    <div className="flex items-center gap-2">
                      <Input value="30" disabled className="w-24" />
                      <span className="text-muted-foreground">days</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Administrative operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Button
                    variant="outline"
                    onClick={handleRefreshRates}
                    disabled={refreshingRates}
                  >
                    {refreshingRates ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh Market Rates
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleClearCache}
                    disabled={clearingCache}
                  >
                    {clearingCache ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Database className="h-4 w-4 mr-2" />
                    )}
                    Clear Cache
                  </Button>
                  <Dialog
                    open={notificationDialogOpen}
                    onOpenChange={setNotificationDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Bell className="h-4 w-4 mr-2" />
                        Send System Notification
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Send System Notification</DialogTitle>
                        <DialogDescription>
                          Broadcast a notification to all users or specific
                          roles.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input
                            placeholder="Notification title"
                            value={notificationData.title}
                            onChange={(e) =>
                              setNotificationData((prev) => ({
                                ...prev,
                                title: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Message</Label>
                          <Textarea
                            placeholder="Notification message..."
                            rows={3}
                            value={notificationData.message}
                            onChange={(e) =>
                              setNotificationData((prev) => ({
                                ...prev,
                                message: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select
                            value={notificationData.type}
                            onValueChange={(value) =>
                              setNotificationData((prev) => ({
                                ...prev,
                                type: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="INFO">Information</SelectItem>
                              <SelectItem value="WARNING">Warning</SelectItem>
                              <SelectItem value="SUCCESS">Success</SelectItem>
                              <SelectItem value="ERROR">Error</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Target Roles (leave empty for all)</Label>
                          <Select
                            value={notificationData.targetRoles[0] || "all"}
                            onValueChange={(value) =>
                              setNotificationData((prev) => ({
                                ...prev,
                                targetRoles: value === "all" ? [] : [value],
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All Users" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Users</SelectItem>
                              <SelectItem value="ADMIN">Admins Only</SelectItem>
                              <SelectItem value="SHOPKEEPER">
                                Shopkeepers Only
                              </SelectItem>
                              <SelectItem value="CUSTOMER">
                                Customers Only
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setNotificationDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSendNotification}
                          disabled={sendingNotification}
                        >
                          {sendingNotification ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Send
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  These actions affect the entire platform. Use with caution.
                </p>
              </CardContent>
            </Card>

            {/* Email Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Settings
                </CardTitle>
                <CardDescription>
                  Configure and test email delivery
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Email Status */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {loadingEmailStatus ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : emailStatus?.configured ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">SMTP Status</p>
                      <p className="text-sm text-muted-foreground">
                        {loadingEmailStatus
                          ? "Checking configuration..."
                          : emailStatus?.configured
                            ? `Configured • Sender: ${emailStatus.sender}`
                            : "Not configured - check environment variables"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      emailStatus?.configured ? "default" : "destructive"
                    }
                  >
                    {loadingEmailStatus
                      ? "Loading"
                      : emailStatus?.configured
                        ? "Active"
                        : "Inactive"}
                  </Badge>
                </div>

                {/* Test Email */}
                <div className="space-y-3">
                  <Label>Send Test Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Verify that email delivery is working correctly
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="recipient@example.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendTestEmail}
                      disabled={sendingTestEmail || !emailStatus?.configured}
                    >
                      {sendingTestEmail ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send Test
                    </Button>
                  </div>
                </div>

                {/* Change Admin Email */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Admin Notification Email</Label>
                      <p className="text-sm text-muted-foreground">
                        Email address where admin alerts are sent
                      </p>
                    </div>
                    <Dialog
                      open={emailDialogOpen}
                      onOpenChange={setEmailDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <KeyRound className="h-4 w-4 mr-2" />
                          Change Admin Email
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Change Admin Email</DialogTitle>
                          <DialogDescription>
                            Update the email address for admin notifications and
                            alerts. You must verify your identity with your
                            current password.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Current Email</Label>
                            <Input
                              value={user?.email || ""}
                              disabled
                              className="bg-muted"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newEmail">New Admin Email</Label>
                            <Input
                              id="newEmail"
                              type="email"
                              placeholder="new-admin@example.com"
                              value={adminEmailForm.newEmail}
                              onChange={(e) =>
                                setAdminEmailForm((prev) => ({
                                  ...prev,
                                  newEmail: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="currentPassword">
                              Current Password
                            </Label>
                            <Input
                              id="currentPassword"
                              type="password"
                              placeholder="Enter your password to confirm"
                              value={adminEmailForm.currentPassword}
                              onChange={(e) =>
                                setAdminEmailForm((prev) => ({
                                  ...prev,
                                  currentPassword: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEmailDialogOpen(false);
                              setAdminEmailForm({
                                newEmail: "",
                                currentPassword: "",
                              });
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleUpdateAdminEmail}
                            disabled={updatingAdminEmail}
                          >
                            {updatingAdminEmail ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4 mr-2" />
                            )}
                            Update Email
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
