"use client";

import { ShopGuard } from "@/components/auth/RouteGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useState } from "react";

interface DesktopStatus {
  hasDesktop: boolean;
  isUpToDate: boolean;
  latestVersion: string | null;
  sessions: Array<{
    id: string;
    appVersion: string;
    os: string;
    arch: string | null;
    isLatest: boolean;
    lastSeen: string;
    firstSeen: string;
  }>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DesktopAppPage() {
  const [status, setStatus] = useState<DesktopStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await api.get("/releases/my-desktop");
        setStatus(res.data);
      } catch (err) {
        console.error("Failed to fetch desktop status:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  return (
    <ShopGuard>
      <DashboardLayout>
        <div className="space-y-6 max-w-3xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ComputerDesktopIcon className="h-6 w-6 text-gold-500" />
              Desktop App
            </h1>
            <p className="text-muted-foreground">
              Manage and track your Orivraa desktop application
            </p>
          </div>

          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="w-8 h-8 rounded-full border-3 border-transparent border-t-gold-500 border-r-gold-300 animate-spin" />
              </CardContent>
            </Card>
          ) : !status?.hasDesktop ? (
            /* No desktop detected */
            <Card className="border-gold-500/20">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-gold-500/10 flex items-center justify-center mb-4">
                  <ComputerDesktopIcon className="h-8 w-8 text-gold-500" />
                </div>
                <CardTitle className="text-xl">
                  Get the Orivraa Desktop App
                </CardTitle>
                <CardDescription className="max-w-md mx-auto">
                  Manage your shop faster with offline support, native
                  notifications, and seamless Google sign-in. The desktop app
                  keeps everything at your fingertips.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 pb-8">
                <Button
                  className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white gap-2"
                  asChild
                >
                  <Link href="/download">
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    Download Desktop App
                  </Link>
                </Button>
                {status?.latestVersion && (
                  <p className="text-xs text-muted-foreground">
                    Latest version: v{status.latestVersion}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 w-full max-w-md">
                  {[
                    { icon: "⚡", text: "Faster performance" },
                    { icon: "📴", text: "Works offline" },
                    { icon: "🔔", text: "System notifications" },
                  ].map((f, i) => (
                    <div
                      key={i}
                      className="text-center p-3 rounded-lg border border-border/50"
                    >
                      <span className="text-xl">{f.icon}</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {f.text}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Desktop detected */
            <>
              {/* Status Card */}
              <Card
                className={
                  status.isUpToDate
                    ? "border-green-500/20"
                    : "border-amber-500/20"
                }
              >
                <CardContent className="flex items-center gap-4 py-5">
                  {status.isUpToDate ? (
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <CheckCircleIcon className="w-6 h-6 text-green-500" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                      <ExclamationTriangleIcon className="w-6 h-6 text-amber-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">
                      {status.isUpToDate
                        ? "You're up to date!"
                        : "Update available"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {status.isUpToDate
                        ? `Running the latest version (v${status.latestVersion})`
                        : `Latest version is v${status.latestVersion}. Download the update to get the latest features.`}
                    </p>
                  </div>
                  {!status.isUpToDate && (
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white gap-1.5 shrink-0"
                      asChild
                    >
                      <Link href="/download">
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        Update
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Sessions */}
              <div>
                <h2 className="text-lg font-semibold mb-3">Your Devices</h2>
                <div className="space-y-3">
                  {(status.sessions || []).map((session) => (
                    <Card key={session.id} className="border-border/50">
                      <CardContent className="flex items-center gap-4 py-4">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <ComputerDesktopIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">
                              v{session.appVersion}
                            </p>
                            {session.isLatest ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                                Latest
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                Outdated
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {session.os}
                            {session.arch ? ` (${session.arch})` : ""} &middot;
                            Last seen {timeAgo(session.lastSeen)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Links */}
          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/download">Downloads Page</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/download/changelog">Changelog</Link>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    </ShopGuard>
  );
}
