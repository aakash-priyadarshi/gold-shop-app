"use client";

import { AdminGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
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
import { Switch } from "@/components/ui/switch";
import { T } from "@/components/ui/T";
import { toast } from "@/hooks/use-toast";
import { ticketsApi } from "@/lib/api";
import {
  ArrowLeft,
  Bell,
  Loader2,
  Mail,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function LeadAlertSettingsPage() {
  const [emails, setEmails] = useState<string[]>([]);
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ticketsApi.getLeadAlertSettings();
      const data = res.data?.data ?? res.data;
      setEmails(data?.emails || []);
      setDigestEnabled(data?.digestEnabled !== false);
      setUpdatedAt(data?.updatedAt || null);
    } catch (err: any) {
      toast({
        title: "Failed to load alert settings",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const addEmail = () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) {
      toast({
        title: "Invalid email",
        description: "Enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    if (emails.includes(trimmed)) {
      toast({
        title: "Already added",
        description: "That email is already in the list.",
      });
      return;
    }
    if (emails.length >= 10) {
      toast({
        title: "Limit reached",
        description: "You can add up to 10 alert emails.",
        variant: "destructive",
      });
      return;
    }
    setEmails((prev) => [...prev, trimmed]);
    setNewEmail("");
  };

  const removeEmail = (email: string) => {
    setEmails((prev) => prev.filter((e) => e !== email));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await ticketsApi.updateLeadAlertSettings({
        emails,
        digestEnabled,
      });
      const data = res.data?.data ?? res.data;
      setUpdatedAt(data?.updatedAt || null);
      toast({ title: "Alert settings saved" });
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6 p-4 md:p-6 max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/admin/leads">
                <ArrowLeft className="h-4 w-4 mr-1" />
                <T>Back to leads</T>
              </Link>
            </Button>
          </div>

          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              <T>Lead alert settings</T>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              <T>
                Choose who gets emailed when the AI chatbot captures a new lead.
                In-app notifications still go to all admins.
              </T>
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-12">
              <Loader2 className="h-5 w-5 animate-spin" />
              <T>Loading settings…</T>
            </div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <T>Alert emails</T>
                  </CardTitle>
                  <CardDescription>
                    <T>
                      Add one or more addresses. Each new lead capture sends a
                      realtime email to every address listed here.
                    </T>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="new-alert-email">
                        <T>Email address</T>
                      </Label>
                      <Input
                        id="new-alert-email"
                        type="email"
                        placeholder="you@example.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addEmail();
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="button" variant="secondary" onClick={addEmail}>
                        <Plus className="h-4 w-4 mr-1" />
                        <T>Add</T>
                      </Button>
                    </div>
                  </div>

                  {emails.length === 0 ? (
                    <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                      <T>
                        No alert emails yet — add yours above and save. Until
                        then, only in-app admin notifications are sent.
                      </T>
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {emails.map((email) => (
                        <li
                          key={email}
                          className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                        >
                          <span className="truncate">{email}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeEmail(email)}
                            aria-label={`Remove ${email}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    <T>Daily digest</T>
                  </CardTitle>
                  <CardDescription>
                    <T>
                      Every morning at 9 AM, email a summary of leads still
                      marked NEW (uncontacted).
                    </T>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="digest-enabled" className="cursor-pointer">
                      <T>Send daily NEW-leads digest</T>
                    </Label>
                    <Switch
                      id="digest-enabled"
                      checked={digestEnabled}
                      onCheckedChange={setDigestEnabled}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-wrap items-center justify-between gap-3">
                {updatedAt && (
                  <p className="text-xs text-muted-foreground">
                    <T>Last saved</T>: {new Date(updatedAt).toLocaleString()}
                  </p>
                )}
                <Button onClick={save} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  <T>Save settings</T>
                </Button>
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
