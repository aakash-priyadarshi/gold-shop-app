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
  AlertCircle,
  ArrowUpCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  Download,
  ExternalLink,
  FileText,
  HardDrive,
  Info,
  Monitor,
  Package,
  Plus,
  RefreshCw,
  Server,
  Smartphone,
  Terminal,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
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
  total: number;
  activeLast24h: number;
  activeLast7d: number;
  upToDate: number;
  outdated: number;
  versionDistribution: Array<{ version: string; count: number }>;
  osDistribution: Array<{ os: string; count: number }>;
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
  const [expandedRelease, setExpandedRelease] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

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
      const { channel: _channel, ...publishData } = publishForm;
      void _channel;
      await api.post("/releases/publish", {
        ...publishData,
        fileSize: publishData.fileSize
          ? parseInt(publishData.fileSize)
          : undefined,
      });
      toast({
        title: "Published",
        description: `v${publishForm.version} released`,
      });
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

  const handleDelete = async (id: string, version: string, platform: string) => {
    if (!confirm(`Delete ${platform} v${version}? This cannot be undone.`)) return;
    try {
      await api.delete(`/releases/admin/${id}`);
      toast({ title: "Deleted", description: `${platform} v${version} removed` });
      fetchData();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
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
          <div className="flex items-center justify-between flex-wrap gap-3">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGuide(!showGuide)}
                className="text-muted-foreground"
              >
                <Info className="w-4 h-4 mr-1" />
                Guide
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/download" target="_blank">
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  View Download Page
                </Link>
              </Button>
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

          {/* Info Guide */}
          {showGuide && (
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  What&apos;s on this page
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium text-foreground mb-1">
                      Releases Tab
                    </p>
                    <ul className="space-y-1 text-xs list-disc pl-4">
                      <li>
                        All published desktop and web releases with version,
                        platform, channel, date, and file size
                      </li>
                      <li>
                        Click a release row to expand and see full details:
                        download URL, changelog, system requirements,
                        architecture
                      </li>
                      <li>
                        <Badge className="bg-green-500/10 text-green-600 border-0 text-[10px] px-1">
                          Latest
                        </Badge>{" "}
                        badge marks the current version shown on the download
                        page
                      </li>
                      <li>
                        Toggle active/inactive with the{" "}
                        <X className="w-3 h-3 inline text-red-500" />/
                        <Check className="w-3 h-3 inline text-green-500" />{" "}
                        button — inactive releases are hidden from public pages
                      </li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">
                      Desktop Analytics Tab
                    </p>
                    <ul className="space-y-1 text-xs list-disc pl-4">
                      <li>
                        <strong>Total Devices</strong> — all desktop
                        installations that have ever sent a heartbeat
                      </li>
                      <li>
                        <strong>Active (24h / 7d)</strong> — devices that
                        checked in within the last 24 hours or 7 days
                      </li>
                      <li>
                        <strong>Up to Date / Outdated</strong> — how many run
                        the latest version vs older
                      </li>
                      <li>
                        <strong>Version Distribution</strong> — bar chart
                        showing how many devices run each version
                      </li>
                      <li>
                        <strong>OS Distribution</strong> — breakdown by
                        operating system (windows, macos, linux)
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="border-t border-border/50 pt-3">
                  <p className="font-medium text-foreground mb-1">
                    Publishing Flow
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="flex gap-2">
                      <Terminal className="w-4 h-4 shrink-0 text-blue-500 mt-0.5" />
                      <div>
                        <strong>Automatic (local build):</strong> After running{" "}
                        <code className="px-1 py-0.5 bg-muted rounded text-[10px]">
                          cargo tauri build
                        </code>
                        , run{" "}
                        <code className="px-1 py-0.5 bg-muted rounded text-[10px]">
                          .\apps\desktop\scripts\publish-release.ps1
                        </code>{" "}
                        — it reads version from Cargo.toml, finds the installer,
                        copies it, and calls the publish API automatically.
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Plus className="w-4 h-4 shrink-0 text-blue-500 mt-0.5" />
                      <div>
                        <strong>Manual:</strong> Click &quot;Publish
                        Release&quot; button above and fill in version,
                        platform, download URL, file size, and changelog. The
                        system auto-sets it as latest and deactivates releases
                        beyond the 6-version limit.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats Row */}
          {!loading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="border-border/50">
                <CardContent className="py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gold-500/10 flex items-center justify-center">
                    <Package className="w-4 h-4 text-gold-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{releases.length}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Total Releases
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">
                      {releases.filter((r) => r.isLatest).length}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Latest Versions
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Monitor className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{analytics?.total || 0}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Desktop Devices
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">
                      {analytics?.activeLast24h || 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Active Today
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
                        setPublishForm({
                          ...publishForm,
                          version: e.target.value,
                        })
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
                    <Label>Download URL *</Label>
                    <Input
                      placeholder="https://releases.orivraa.com/desktop/v1.0.0/..."
                      value={publishForm.downloadUrl}
                      onChange={(e) =>
                        setPublishForm({
                          ...publishForm,
                          downloadUrl: e.target.value,
                        })
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
                        setPublishForm({
                          ...publishForm,
                          fileSize: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>File Name</Label>
                    <Input
                      placeholder="Orivraa_1.0.0_x64-setup.exe"
                      value={publishForm.fileName}
                      onChange={(e) =>
                        setPublishForm({
                          ...publishForm,
                          fileName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Min OS</Label>
                    <Input
                      value={publishForm.minOs}
                      onChange={(e) =>
                        setPublishForm({
                          ...publishForm,
                          minOs: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Min RAM</Label>
                    <Input
                      value={publishForm.minRam}
                      onChange={(e) =>
                        setPublishForm({
                          ...publishForm,
                          minRam: e.target.value,
                        })
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
                        setPublishForm({
                          ...publishForm,
                          changelog: e.target.value,
                        })
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

            {/* ═══ Releases Tab ═══ */}
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
                  {filteredReleases.filter((r) => r.isActive).length !==
                    filteredReleases.length &&
                    ` (${filteredReleases.filter((r) => r.isActive).length} active)`}
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
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => setShowPublish(true)}
                    >
                      Publish your first release
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {filteredReleases.map((rel) => {
                    const isExpanded = expandedRelease === rel.id;
                    return (
                      <Card
                        key={rel.id}
                        className={`border-border/50 transition-all ${!rel.isActive ? "opacity-50" : ""} ${isExpanded ? "border-gold-500/20" : ""}`}
                      >
                        <CardContent className="py-0">
                          {/* Collapsed row */}
                          <div
                            className="flex items-center gap-4 py-3 cursor-pointer"
                            onClick={() =>
                              setExpandedRelease(isExpanded ? null : rel.id)
                            }
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            )}
                            <div className="flex items-center gap-2 min-w-[160px]">
                              <span className="font-mono font-semibold text-sm">
                                v{rel.version}
                              </span>
                              {rel.isLatest && (
                                <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-0 text-[10px]">
                                  Latest
                                </Badge>
                              )}
                              {!rel.isActive && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  Inactive
                                </Badge>
                              )}
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                              {rel.platform === "WINDOWS"
                                ? "🪟"
                                : rel.platform === "MACOS"
                                  ? "🍎"
                                  : "🌐"}{" "}
                              {rel.platform}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {rel.channel}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex-1">
                              {formatDate(rel.publishedAt)}
                              {rel.fileSize
                                ? ` · ${formatBytes(rel.fileSize)}`
                                : ""}
                            </span>
                            <div
                              className="flex items-center gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
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
                                    title="Download"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() =>
                                  handleToggleActive(rel.id, rel.isActive)
                                }
                                title={rel.isActive ? "Deactivate" : "Activate"}
                              >
                                {rel.isActive ? (
                                  <X className="w-3.5 h-3.5 text-red-500" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-green-500" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() =>
                                  handleDelete(rel.id, rel.version, rel.platform)
                                }
                                title="Delete permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                              </Button>
                            </div>
                          </div>

                          {/* Expanded details */}
                          {isExpanded && (
                            <div className="pb-4 pt-1 pl-8 border-t border-border/30 space-y-3">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                <div>
                                  <span className="text-muted-foreground">
                                    File Name
                                  </span>
                                  <p className="font-medium truncate">
                                    {rel.fileName || "—"}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    File Size
                                  </span>
                                  <p className="font-medium">
                                    {rel.fileSize
                                      ? formatBytes(rel.fileSize)
                                      : "—"}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    Architecture
                                  </span>
                                  <p className="font-medium">
                                    {rel.architecture || "—"}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    Published
                                  </span>
                                  <p className="font-medium">
                                    {formatDate(rel.publishedAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                                <div>
                                  <span className="text-muted-foreground flex items-center gap-1">
                                    <Server className="w-3 h-3" /> Min OS
                                  </span>
                                  <p className="font-medium">
                                    {rel.minOs || "Not specified"}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground flex items-center gap-1">
                                    <Cpu className="w-3 h-3" /> Min RAM
                                  </span>
                                  <p className="font-medium">
                                    {rel.minRam || "Not specified"}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground flex items-center gap-1">
                                    <HardDrive className="w-3 h-3" /> Min Disk
                                  </span>
                                  <p className="font-medium">
                                    {rel.minDisk || "Not specified"}
                                  </p>
                                </div>
                              </div>
                              {rel.downloadUrl && (
                                <div className="text-xs">
                                  <span className="text-muted-foreground">
                                    Download URL
                                  </span>
                                  <p className="font-mono text-[11px] break-all text-blue-500">
                                    <a
                                      href={rel.downloadUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      {rel.downloadUrl}
                                    </a>
                                  </p>
                                </div>
                              )}
                              {(rel.changelog || rel.githubChangelog) && (
                                <div className="text-xs">
                                  <span className="text-muted-foreground flex items-center gap-1 mb-1">
                                    <FileText className="w-3 h-3" /> Changelog
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] ml-1"
                                    >
                                      {rel.changelogSource}
                                    </Badge>
                                  </span>
                                  <div className="bg-muted/50 rounded-lg p-3 whitespace-pre-line text-[11px] leading-relaxed max-h-40 overflow-y-auto">
                                    {rel.changelog ||
                                      rel.githubChangelog ||
                                      "No changelog"}
                                  </div>
                                </div>
                              )}
                              <div className="text-[10px] text-muted-foreground">
                                ID: {rel.id} · Created:{" "}
                                {formatDate(rel.createdAt)}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ═══ Analytics Tab ═══ */}
            <TabsContent value="analytics" className="space-y-4 mt-4">
              {!analytics ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 rounded-full border-3 border-transparent border-t-gold-500 border-r-gold-300 animate-spin" />
                </div>
              ) : (
                <>
                  {/* Info banner */}
                  <Card className="border-blue-500/10 bg-blue-500/5">
                    <CardContent className="py-3 flex items-start gap-3">
                      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <div className="text-xs text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">
                          How Desktop Analytics Works
                        </p>
                        <p>
                          Every desktop app sends a <strong>heartbeat</strong>{" "}
                          every 30 minutes containing its version, OS, and
                          architecture. The first heartbeat fires 15 seconds
                          after launch. This data powers the stats below.
                          Devices are identified by user ID + IP address
                          combination.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stat cards */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      {
                        label: "Total Devices",
                        value: analytics.total,
                        icon: Monitor,
                        color: "text-gold-500 bg-gold-500/10",
                        desc: "All-time unique installations",
                      },
                      {
                        label: "Active (24h)",
                        value: analytics.activeLast24h,
                        icon: Zap,
                        color: "text-green-500 bg-green-500/10",
                        desc: "Heartbeat in last 24 hours",
                      },
                      {
                        label: "Active (7d)",
                        value: analytics.activeLast7d,
                        icon: Clock,
                        color: "text-blue-500 bg-blue-500/10",
                        desc: "Heartbeat in last 7 days",
                      },
                      {
                        label: "Up to Date",
                        value: analytics.upToDate,
                        icon: Check,
                        color: "text-emerald-500 bg-emerald-500/10",
                        desc: "Running latest version",
                      },
                      {
                        label: "Outdated",
                        value: analytics.outdated,
                        icon: AlertCircle,
                        color: "text-amber-500 bg-amber-500/10",
                        desc: "Need update prompt",
                      },
                    ].map((stat, i) => (
                      <Card key={i} className="border-border/50">
                        <CardContent className="py-4">
                          <div
                            className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mb-2`}
                          >
                            <stat.icon className="w-4 h-4" />
                          </div>
                          <p className="text-2xl font-bold">{stat.value}</p>
                          <p className="text-xs font-medium">{stat.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {stat.desc}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Adoption rate */}
                  {analytics.total > 0 && (
                    <Card className="border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          Update Adoption
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Percentage of devices running the latest version
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                              style={{
                                width: `${Math.round((analytics.upToDate / analytics.total) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-lg font-bold w-16 text-right">
                            {Math.round(
                              (analytics.upToDate / analytics.total) * 100,
                            )}
                            %
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          {analytics.upToDate} of {analytics.total} devices are
                          up to date
                          {analytics.outdated > 0 &&
                            ` · ${analytics.outdated} will be prompted to update on next launch`}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Version Distribution */}
                  <Card className="border-border/50">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Package className="w-4 h-4 text-gold-500" />
                        Version Distribution
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Number of active installations per app version
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {analytics.versionDistribution.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No data yet — waiting for first heartbeat
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {analytics.versionDistribution.map((item) => {
                            const pct =
                              analytics.total > 0
                                ? Math.round(
                                    (item.count / analytics.total) * 100,
                                  )
                                : 0;
                            return (
                              <div
                                key={item.version}
                                className="flex items-center gap-3"
                              >
                                <span className="text-sm font-mono w-20 shrink-0">
                                  v{item.version}
                                </span>
                                <div className="flex-1 h-7 bg-muted rounded-full overflow-hidden relative">
                                  <div
                                    className="h-full bg-gradient-to-r from-gold-500 to-gold-600 rounded-full transition-all flex items-center justify-end pr-2"
                                    style={{ width: `${Math.max(pct, 5)}%` }}
                                  >
                                    {pct >= 15 && (
                                      <span className="text-[10px] text-white font-medium">
                                        {pct}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className="text-xs text-muted-foreground w-20 text-right shrink-0">
                                  {item.count} device
                                  {item.count !== 1 ? "s" : ""}
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
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-blue-500" />
                        OS Distribution
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Operating systems reported by desktop heartbeats
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {analytics.osDistribution.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No data yet
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {analytics.osDistribution.map((item) => {
                            const pct =
                              analytics.total > 0
                                ? Math.round(
                                    (item.count / analytics.total) * 100,
                                  )
                                : 0;
                            const osEmoji =
                              item.os === "windows"
                                ? "🪟"
                                : item.os === "macos"
                                  ? "🍎"
                                  : item.os === "linux"
                                    ? "🐧"
                                    : "💻";
                            return (
                              <Card key={item.os} className="border-border/50">
                                <CardContent className="py-3 text-center">
                                  <span className="text-2xl">{osEmoji}</span>
                                  <p className="text-sm font-medium capitalize mt-1">
                                    {item.os}
                                  </p>
                                  <p className="text-lg font-bold">
                                    {item.count}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {pct}% of devices
                                  </p>
                                </CardContent>
                              </Card>
                            );
                          })}
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
