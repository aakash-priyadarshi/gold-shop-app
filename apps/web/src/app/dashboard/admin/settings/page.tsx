'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AdminGuard } from '@/components/auth/RouteGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Percent,
  Globe,
  DollarSign,
  Shield,
  Bell,
  Database,
  RefreshCw,
  Loader2,
  Send,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { adminApi } from '@/lib/api';


const supportedRegions = [
  { code: 'NP', name: 'Nepal', currency: 'NPR', flag: '🇳🇵' },
  { code: 'IN', name: 'India', currency: 'INR', flag: '🇮🇳' },
  { code: 'US', name: 'United States', currency: 'USD', flag: '🇺🇸' },
  { code: 'UK', name: 'United Kingdom', currency: 'GBP', flag: '🇬🇧' },
  { code: 'AE', name: 'UAE', currency: 'AED', flag: '🇦🇪' },
  { code: 'EU', name: 'European Union', currency: 'EUR', flag: '🇪🇺' },
];

const supportedCurrencies = ['NPR', 'INR', 'USD', 'GBP', 'AED', 'EUR'];

export default function AdminSettingsPage() {
  const [refreshingRates, setRefreshingRates] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [notificationData, setNotificationData] = useState({
    title: '',
    message: '',
    type: 'INFO',
    targetRoles: [] as string[],
  });

  const handleRefreshRates = async () => {
    setRefreshingRates(true);
    try {
      await adminApi.refreshMarketRates();
      toast({
        title: 'Market Rates Refreshed',
        description: 'Latest market rates have been fetched successfully.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Refresh Failed',
        description: 'Could not refresh market rates. Try again later.',
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
        title: 'Cache Cleared',
        description: 'Platform cache has been cleared successfully.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Clear Failed',
        description: 'Could not clear cache. Try again later.',
      });
    } finally {
      setClearingCache(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notificationData.title || !notificationData.message) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill in title and message.',
      });
      return;
    }

    setSendingNotification(true);
    try {
      await adminApi.broadcastNotification(notificationData);
      toast({
        title: 'Notification Sent',
        description: 'System notification has been broadcasted.',
      });
      setNotificationDialogOpen(false);
      setNotificationData({ title: '', message: '', type: 'INFO', targetRoles: [] });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Send Failed',
        description: 'Could not send notification. Try again later.',
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
                      Platform earns 1% on each successful transaction.
                      This setting is currently read-only.
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
                      <span className="text-2xl">{region.flag}</span>
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
                    <Badge key={currency} variant="outline" className="text-sm py-1 px-3">
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
                <CardDescription>
                  Administrative operations
                </CardDescription>
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
                  <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
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
                          Broadcast a notification to all users or specific roles.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Title</Label>
                          <Input
                            placeholder="Notification title"
                            value={notificationData.title}
                            onChange={(e) => setNotificationData(prev => ({ ...prev, title: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Message</Label>
                          <Textarea
                            placeholder="Notification message..."
                            rows={3}
                            value={notificationData.message}
                            onChange={(e) => setNotificationData(prev => ({ ...prev, message: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select
                            value={notificationData.type}
                            onValueChange={(value) => setNotificationData(prev => ({ ...prev, type: value }))}
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
                            value={notificationData.targetRoles[0] || 'all'}
                            onValueChange={(value) => setNotificationData(prev => ({ 
                              ...prev, 
                              targetRoles: value === 'all' ? [] : [value] 
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All Users" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Users</SelectItem>
                              <SelectItem value="ADMIN">Admins Only</SelectItem>
                              <SelectItem value="SHOPKEEPER">Shopkeepers Only</SelectItem>
                              <SelectItem value="CUSTOMER">Customers Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setNotificationDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSendNotification} disabled={sendingNotification}>
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
          </div>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
