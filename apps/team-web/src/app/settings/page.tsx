"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { googleBotApi, settingsApi } from "@/lib/api";
import { CheckCircle, ExternalLink, LogOut, Save } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [botStatus, setBotStatus] = useState<{ connected: boolean; email: string | null; hasCachedCookies: boolean }>({
    connected: false,
    email: null,
    hasCachedCookies: false,
  });
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const searchParams = useSearchParams();

  const loadBotStatus = useCallback(async () => {
    try {
      const res = await googleBotApi.getStatus();
      setBotStatus(res.data);
    } catch {
      // OAuth not configured on backend
    }
  }, []);

  useEffect(() => {
    Promise.all([
      settingsApi.get().then((res) => setSettings(res.data ?? {})),
      loadBotStatus(),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [loadBotStatus]);

  // Handle OAuth callback redirect
  useEffect(() => {
    const authResult = searchParams.get("google_auth");
    if (authResult === "success") {
      const email = searchParams.get("email");
      toast.success(`Google account connected: ${email}`);
      loadBotStatus();
      // Clean URL
      window.history.replaceState({}, "", "/settings");
    } else if (authResult === "error") {
      const message = searchParams.get("message");
      toast.error(`Google auth failed: ${message || "Unknown error"}`);
      window.history.replaceState({}, "", "/settings");
    }
  }, [searchParams, loadBotStatus]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.update(settings);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleConnectGoogle = async () => {
    setConnectingGoogle(true);
    try {
      const res = await googleBotApi.getAuthUrl();
      // Open Google OAuth in the same window (will redirect back)
      window.location.href = res.data.url;
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to get auth URL");
      setConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await googleBotApi.disconnect();
      setBotStatus({ connected: false, email: null, hasCachedCookies: false });
      toast.success("Google account disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure your team operations
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Basic team configuration</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <Label>Company Name</Label>
              <Input
                value={settings.companyName ?? ""}
                onChange={(e) =>
                  setSettings({ ...settings, companyName: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Timezone</Label>
              <Input
                value={settings.timezone ?? ""}
                onChange={(e) =>
                  setSettings({ ...settings, timezone: e.target.value })
                }
                placeholder="Asia/Kathmandu"
              />
            </div>
            <div>
              <Label>Default Currency</Label>
              <Input
                value={settings.currency ?? ""}
                onChange={(e) =>
                  setSettings({ ...settings, currency: e.target.value })
                }
                placeholder="NPR"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Work Hours</CardTitle>
            <CardDescription>
              Define standard working hours for attendance tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Work Start Time</Label>
              <Input
                type="time"
                value={settings.workStartTime ?? "09:00"}
                onChange={(e) =>
                  setSettings({ ...settings, workStartTime: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Work End Time</Label>
              <Input
                type="time"
                value={settings.workEndTime ?? "17:00"}
                onChange={(e) =>
                  setSettings({ ...settings, workEndTime: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Late Threshold (minutes)</Label>
              <Input
                type="number"
                value={settings.lateThresholdMinutes ?? 15}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    lateThresholdMinutes: parseInt(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label>Annual Leave Days</Label>
              <Input
                type="number"
                value={settings.annualLeaveDays ?? 18}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    annualLeaveDays: parseInt(e.target.value),
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Sales Configuration</CardTitle>
            <CardDescription>
              Configure AI-powered sales settings
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Google Meet Bot Account</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Connect a Google account so the AI bot can create & join Google Meet meetings via Calendar API.
              </p>
              {botStatus.connected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">Connected</p>
                      <p className="text-xs text-green-600 dark:text-green-400">{botStatus.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" onClick={handleDisconnectGoogle}>
                        <LogOut className="h-3 w-3 mr-1" /> Disconnect
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">✓ Bot can create Google Meet meetings via Calendar API</p>
                </div>
              ) : (
                <Button onClick={handleConnectGoogle} disabled={connectingGoogle}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {connectingGoogle ? "Redirecting to Google..." : "Connect Google Account"}
                </Button>
              )}
            </div>
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Google Session Cookies (for joining invited meetings)</h4>
              <p className="text-xs text-muted-foreground mb-2">
                To let the bot join meetings it didn&apos;t create, paste your Google session cookies here.
                Export them from Chrome using the <strong>EditThisCookie</strong> extension (visit accounts.google.com → export cookies as JSON).
              </p>
              <Textarea
                className="mt-2 font-mono text-xs"
                rows={5}
                value={settings._cookieInput ?? ""}
                onChange={(e) => setSettings({ ...settings, _cookieInput: e.target.value })}
                placeholder='[{"name":"SID","value":"...","domain":".google.com",...}, ...]'
              />
              <Button
                className="mt-2"
                size="sm"
                variant="outline"
                onClick={async () => {
                  const raw = settings._cookieInput?.trim();
                  if (!raw) {
                    toast.error("Paste your cookies JSON array first.");
                    return;
                  }
                  try {
                    const parsed = JSON.parse(raw);
                    if (!Array.isArray(parsed) || parsed.length === 0) {
                      toast.error("Cookies must be a non-empty JSON array.");
                      return;
                    }
                    const res = await googleBotApi.refreshCookies(parsed);
                    const data = res.data as any;
                    toast.success(data.message || "Cookies saved!");
                    setSettings({ ...settings, _cookieInput: "" });
                  } catch (err: any) {
                    if (err instanceof SyntaxError) {
                      toast.error("Invalid JSON. Make sure you paste the full array from EditThisCookie.");
                    } else {
                      toast.error(err.response?.data?.message || "Failed to save cookies");
                    }
                  }
                }}
              >
                <Save className="h-3 w-3 mr-1" /> Save Cookies
              </Button>
              {botStatus.hasCachedCookies && (
                <p className="text-xs text-green-600 mt-2">✓ Session cookies are stored — bot will authenticate when joining meetings</p>
              )}
            </div>
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">AI Sales Email</h4>
              <p className="text-xs text-muted-foreground mb-4">
                The "From" address used when the AI sends emails. Can be an alias like sales@orivraa.com.
              </p>
              <div>
                <Label>AI Sales From Email</Label>
                <Input
                  type="email"
                  value={settings.aiSalesFromEmail ?? ""}
                  onChange={(e) =>
                    setSettings({ ...settings, aiSalesFromEmail: e.target.value })
                  }
                  placeholder="sales@orivraa.com"
                />
              </div>
            </div>
            <div className="pt-4 border-t">
              <Label>Default Sales Greeting</Label>
              <Textarea
                className="mt-2"
                value={settings.salesGreeting ?? ""}
                onChange={(e) =>
                  setSettings({ ...settings, salesGreeting: e.target.value })
                }
                placeholder="Welcome to Orivraa! How can I help you today?"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
