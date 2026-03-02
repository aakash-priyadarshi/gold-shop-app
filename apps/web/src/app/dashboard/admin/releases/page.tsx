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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  Activity,
  ArrowUpCircle,
  Check,
  Clock,
  Download,
  Monitor,
  Package,
  Plus,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Release {
  id: string;
  version: string;
  platform: string;
  channel: string;
  downloadUrl: string | null;
  fileSize: number | null;
  fileName: string | null;
  changelog: string | null;
  githubChangelog: string | null;
  changelogSource: string;
  isLatest: boolean;
  isActive: boolean;
  minOs: string | null;
  minRam: string | null;
  minDisk: string | null;
  architecture: string | null;
  publishedAt: string;
  createdAt: string;
}

interface DesktopAnalytics {
  totalSessions: number;
  activeLast24h: number;
  activeLast7d: number;
  upToDate: number;
  outdated: number;
  versionDistribution: Record<string, number>;
  osDistribution: Record<string, number>;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(b: number) {
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

export default function AdminReleasesPage() {
  const { toast } = useToast();
  const [releases, setReleases] = useState<Release[]>([]);
  const [analytics, setAnalytics] = useState<DesktopAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState("ALL");

  // Publish form
  const [showPublish, setShowPublish] = useState(false);
  const [publishForm, setPublishForm] = useState({
    version: "",
    platform: "WINDOWS",
    channel: "stable",
    downloadUrl: "",
    fileSize: "",
    fileName: "",
    changelog: "",
    minOs: "Windows 10+",
    minRam: "4 GB RAM",
    minDisk: "200 MB",
    architecture: "x86_64",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [relRes, analyticsRes] = await Promise.all([
        api.get("/releases/admin/list"),
        api.get("/releases/admin/analytics"),
      ]);
      setReleases(relRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error("Failed to fetch releases:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePublish = async () => {
    if (!publishForm.version || !publishForm.platform) {
      toast({
        title: "Missing fields",
        description: "Version and platform are required",
        variant: "destructive",
      });
      return;
    }
    setPublishing(true);
    try {
      await api.post("/releases/publish", {
        ...publishForm,
        fileSize: publishForm.fileSize
          ? parseInt(publishForm.fileSize)
          : undefined,
      });
      toast({ title: "Published", description: `v${publishForm.version} released` });
      setShowPublish(false);
      setPublishForm({
        version: "",
        platform: "WINDOWS",
        channel: "stable",
        downloadUrl: "",
        fileSize: "",
        fileName: "",
        changelog: "",
        minOs: "Windows 10+",
        minRam: "4 GB RAM",
        minDisk: "200 MB",
        architecture: "x86_64",
      });
      fetchData();
    } catch (err: any) {
      toast({
        title: "Publish failed",
        description: err?.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await api.patch(`/releases/admin/${id}`, { isActive: !active });
      toast({ title: active ? "Deactivated" : "Activated" });
      fetchData();
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    }
  };

  const filteredReleases =
    filterPlatform === "ALL"
      ? releases
      : releases.filter((r) => r.platform === filterPlatform);

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Package className="h-6 w-6 text-gold-500" />
                Release Management
              </h1>
              <p className="text-muted-foreground">
                Publish, manage versions, and track desktop analytics
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Refresh
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white"
                onClick={() => setShowPublish(!showPublish)}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Publish Release
              </Button>
            </div>
          </div>

          {/* Publish Form */}
          {showPublish && (
            <Card className="border-gold-500/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowUpCircle className="w-5 h-5 text-gold-500" />
                  Publish New Release
                </CardTitle>
                <CardDescription>
                  This will automatically set this as the latest version and
                  deactivate old releases beyond the 6-version limit.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Version *</Label>
                    <Input
                      placeholder="1.0.0"
                      value={publishForm.version}
                      onChange={(e) =>
                        setPublishForm({ ...publishForm, version: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Platform *</Label>
                    <Select
                      value={publishForm.platform}
                      onValueChange={(v) =>
                        setPublishForm({ ...publishForm, platform: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WINDOWS">Windows</SelectItem>
                        <SelectItem value="MACOS">macOS</SelectItem>
                        <SelectItem value="WEB">Web</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Channel</Label>
                    <Select
                      value={publishForm.channel}
                      onValueChange={(v) =>
                        setPublishForm({ ...publishForm, channel: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stable">Stable</SelectItem>
                        <SelectItem value="beta">Beta</SelectItem>
                        <SelectItem value="nightly">Nightly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Download URL</Label>
                    <Input
                      placeholder="https://..."
                      value={publishForm.downloadUrl}
                      onChange={(e) =>
                        setPublishForm({ ...publishForm, downloadUrl: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>File Size (bytes)</Label>
                    <Input
                      type="number"
                      placeholder="52428800"
                      value={publishForm.fileSize}
                      onChange={(e) =>
                        setPublishForm({ ...publishForm, fileSize: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>File Name</Label>
                    <Input
                      placeholder="Orivraa_1.0.0_x64-setup.exe"
                      value={publishForm.fileName}
                      onChange={(e) =>
                        setPublishForm({ ...publishForm, fileName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Min OS</Label>
                    <Input
                      value={publishForm.minOs}
                      onChange={(e) =>
                        setPublishForm({ ...publishForm, minOs: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Min RAM</Label>
                    <Input
                      value={publishForm.minRam}
                      onChange={(e) =>
                        setPublishForm({ ...publishForm, minRam: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Architecture</Label>
                    <Input
                      value={publishForm.architecture}
                      onChange={(e) =>
                        setPublishForm({
                          ...publishForm,
                          architecture: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
                    <Label>Changelog</Label>
                    <Textarea
                      rows={4}
                      placeholder="What's new in this release..."
                      value={publishForm.changelog}
                      onChange={(e) =>
                        setPublishForm({ ...publishForm, changelog: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowPublish(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white gap-1.5"
                    onClick={handlePublish}
                    disabled={publishing}
                  >
                    {publishing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowUpCircle className="w-4 h-4" />
                    )}
                    Publish
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="releases">
            <TabsList>
              <TabsTrigger value="releases">
                <Package className="w-4 h-4 mr-1.5" />
                Releases
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <Activity className="w-4 h-4 mr-1.5" />
                Desktop Analytics
              </TabsTrigger>
            </TabsList>

            {/* Releases Tab */}
            <TabsContent value="releases" className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <Select
                  value={filterPlatform}
                  onValueChange={setFilterPlatform}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Platforms</SelectItem>
                    <SelectItem value="WINDOWS">Windows</SelectItem>
                    <SelectItem value="MACOS">macOS</SelectItem>
                    <SelectItem value="WEB">Web</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  {filteredReleases.length} release
                  {filteredReleases.length !== 1 ? "s" : ""}
                </span>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 rounded-full border-3 border-transparent border-t-gold-500 border-r-gold-300 animate-spin" />
                </div>
              ) : filteredReleases.length === 0 ? (
                <Card className="border-border/50">
                  <CardContent className="flex flex-col items-center py-12">
                    <Package className="w-12 h-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No releases found</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {filteredReleases.map((rel) => (
                    <Card
                      key={rel.id}
                      className={`border-border/50 ${!rel.isActive ? "opacity-50" : ""}`}
                    >
                      <CardContent className="flex items-center gap-4 py-3">
                        <div className="flex items-center gap-2 min-w-[180px]">
                          <span className="font-mono font-semibold text-sm">
                            v{rel.version}
                          </span>
                          {rel.isLatest && (
                            <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-0 text-[10px]">
                              Latest
                            </Badge>
                          )}
                          {!rel.isActive && (
                            <Badge variant="outline" className="text-[10px]">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {rel.platform}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {rel.channel}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex-1">
                          {formatDate(rel.publishedAt)}
                          {rel.fileSize ? ` · ${formatBytes(rel.fileSize)}` : ""}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {rel.downloadUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              asChild
                            >
                              <a
                                href={rel.downloadUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleToggleActive(rel.id, rel.isActive)}
                          >
                            {rel.isActive ? (
                              <X className="w-3.5 h-3.5 text-red-500" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-green-500" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4 mt-4">
              {!analytics ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 rounded-full border-3 border-transparent border-t-gold-500 border-r-gold-300 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      {
                        label: "Total Devices",
                        value: analytics.totalSessions,
                        icon: Monitor,
                      },
                      {
                        label: "Active (24h)",
                        value: analytics.activeLast24h,
                        icon: Activity,
                      },
                      {
                        label: "Active (7d)",
                        value: analytics.activeLast7d,
                        icon: Clock,
                      },
                      {
                        label: "Up to Date",
                        value: analytics.upToDate,
                        icon: Check,
                        sub: `${analytics.outdated} outdated`,
                      },
                    ].map((stat, i) => (
                      <Card key={i} className="border-border/50">
                        <CardContent className="py-4 text-center">
                          <stat.icon className="w-5 h-5 mx-auto text-gold-500 mb-1" />
                          <p className="text-2xl font-bold">{stat.value}</p>
                          <p className="text-xs text-muted-foreground">
                            {stat.label}
                          </p>
                          {stat.sub && (
                            <p className="text-[10px] text-amber-500 mt-0.5">
                              {stat.sub}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Version Distribution */}
                  <Card className="border-border/50">
                    <CardHeader>
                      <CardTitle className="text-sm">
                        Version Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Object.keys(analytics.versionDistribution).length ===
                      0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No data yet
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {Object.entries(analytics.versionDistribution)
                            .sort(([, a], [, b]) => b - a)
                            .map(([version, count]) => {
                              const pct = Math.round(
                                (count / analytics.totalSessions) * 100,
                              );
                              return (
                                <div key={version} className="flex items-center gap-3">
                                  <span className="text-sm font-mono w-20">
                                    v{version}
                                  </span>
                                  <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-gold-500 to-gold-600 rounded-full transition-all"
                                      style={{ width: `${Math.max(pct, 2)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground w-16 text-right">
                                    {count} ({pct}%)
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* OS Distribution */}
                  <Card className="border-border/50">
                    <CardHeader>
                      <CardTitle className="text-sm">
                        OS Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {Object.keys(analytics.osDistribution).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No data yet
                        </p>
                      ) : (
                        <div className="flex gap-4 flex-wrap">
                          {Object.entries(analytics.osDistribution)
                            .sort(([, a], [, b]) => b - a)
                            .map(([os, count]) => (
                              <div
                                key={os}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50"
                              >
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium capitalize">
                                  {os}
                                </span>
                                <Badge variant="outline" className="text-[10px]">
                                  {count}
                                </Badge>
                              </div>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </AdminGuard>
  );
}
