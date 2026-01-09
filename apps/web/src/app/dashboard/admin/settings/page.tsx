'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { AdminGuard } from '@/components/auth/RouteGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Percent,
  Globe,
  DollarSign,
  Shield,
  Bell,
  Database,
  RefreshCw,
} from 'lucide-react';

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
                  <Button variant="outline" disabled>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Market Rates
                  </Button>
                  <Button variant="outline" disabled>
                    <Database className="h-4 w-4 mr-2" />
                    Clear Cache
                  </Button>
                  <Button variant="outline" disabled>
                    <Bell className="h-4 w-4 mr-2" />
                    Send System Notification
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  These actions are available through the CI/CD pipeline.
                  Use GitHub Actions for manual operations.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
