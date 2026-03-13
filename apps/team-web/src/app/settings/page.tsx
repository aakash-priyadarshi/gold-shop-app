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
import { settingsApi } from "@/lib/api";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsApi
      .get()
      .then((res) => setSettings(res.data ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
              <h4 className="text-sm font-medium mb-2">Google Meet Bot Credentials</h4>
              <p className="text-xs text-muted-foreground mb-4">
                The bot will log into this Google Account to join meetings as an authenticated user.
              </p>
              <div className="grid gap-4">
                <div>
                  <Label>Google Account Email</Label>
                  <Input
                    type="email"
                    value={settings.googleMeetBotEmail ?? ""}
                    onChange={(e) =>
                      setSettings({ ...settings, googleMeetBotEmail: e.target.value })
                    }
                    placeholder="bot@yourdomain.com"
                  />
                </div>
                <div>
                  <Label>Google Account Password</Label>
                  <Input
                    type="password"
                    value={settings.googleMeetBotPassword ?? ""}
                    onChange={(e) =>
                      setSettings({ ...settings, googleMeetBotPassword: e.target.value })
                    }
                    placeholder="password"
                  />
                </div>
              </div>
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
