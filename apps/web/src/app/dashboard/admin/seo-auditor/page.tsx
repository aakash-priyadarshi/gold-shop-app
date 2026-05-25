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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Eye,
  FileCheck2,
  Globe,
  HelpCircle,
  Info,
  Maximize2,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  UserCheck,
  XCircle,
} from "lucide-react";
import React, { useEffect, useState } from "react";

interface CrawlResult {
  status: number;
  redirectTarget: string | null;
}

interface SeoAuditPageReport {
  path: string;
  score: number;
  status: "SUCCESS" | "WARNING" | "ERROR";
  title: string | null;
  description: string | null;
  h1Count: number;
  wordCount: number;
  canonical: string | null;
  robots: string | null;
  recommendations: string[];
  crawlResults: {
    googlebotMobile: CrawlResult;
    googlebotDesktop: CrawlResult;
    browserDesktop: CrawlResult;
    browserMobile: CrawlResult;
  };
}

interface SeoAuditReport {
  id: string;
  timestamp: string;
  overallScore: number;
  totalPages: number;
  indexablePages: number;
  redirectPages: number;
  errorPages: number;
  warningPages: number;
  criticalRedirects: number;
  pages: SeoAuditPageReport[];
}

interface SeoAuditSettings {
  isAutoCheckEnabled: boolean;
  schedule: "daily" | "weekly" | "disabled";
  targetUrl: string | null;
}

export default function SeoAuditorPage() {
  const { toast } = useToast();
  const [report, setReport] = useState<SeoAuditReport | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [settings, setSettings] = useState<SeoAuditSettings>({
    isAutoCheckEnabled: true,
    schedule: "weekly",
    targetUrl: null,
  });
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUCCESS" | "WARNING" | "ERROR">("ALL");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  // Settings form states
  const [formAutoCheck, setFormAutoCheck] = useState(true);
  const [formSchedule, setFormSchedule] = useState<"daily" | "weekly" | "disabled">("weekly");
  const [formTargetUrl, setFormTargetUrl] = useState("");

  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);

  const fetchAuditData = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/seo-audit/status");
      if (response.data?.success) {
        setReport(response.data.latestReport);
        setHistory(response.data.history || []);
        const apiSettings = response.data.settings || {
          isAutoCheckEnabled: true,
          schedule: "weekly",
          targetUrl: null,
        };
        setSettings(apiSettings);
        setFormAutoCheck(apiSettings.isAutoCheckEnabled);
        setFormSchedule(apiSettings.schedule);
        setFormTargetUrl(apiSettings.targetUrl || "");
      }
    } catch (err) {
      console.error("Failed to load SEO status:", err);
      toast({
        title: "Load Error",
        description: "Could not fetch SEO audit statistics from backend.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  // Trigger real-time crawler bot check
  async function triggerCrawl() {
    if (running) return;
    setRunning(true);
    setScanLogs(["Initializing Orivraa SEO Auditor Bot...", "Resolving marketing and product routes..."]);
    setCurrentProgress(5);

    // Mock progress visualizer
    const logIntervals = [
      { progress: 15, msg: "Simulating Googlebot Mobile crawler on home page / ..." },
      { progress: 28, msg: "Simulating desktop Chrome browser on pricing and billing modules..." },
      { progress: 42, msg: "Fetching verified vendor shops and scanning deep links..." },
      { progress: 55, msg: "Inspecting header Content-Security-Policy & robots meta-tags..." },
      { progress: 70, msg: "Parsing title/H1 heading structures and canonical tag mismatch alerts..." },
      { progress: 85, msg: "Validating redirect links for authorization session timeouts..." },
      { progress: 95, msg: "Compiling optimization scores and compiling content suggestions..." },
    ];

    logIntervals.forEach((step, idx) => {
      setTimeout(() => {
        setScanLogs((prev) => [...prev, step.msg]);
        setCurrentProgress(step.progress);
      }, (idx + 1) * 800);
    });

    try {
      const response = await api.post("/admin/seo-audit/run");
      setTimeout(() => {
        if (response.data?.success) {
          setReport(response.data.report);
          setScanLogs((prev) => [...prev, "🎉 Audit completed! Loading visual health reports."]);
          setCurrentProgress(100);
          toast({
            title: "Crawl Completed",
            description: "Website audited successfully. Visual analysis updated below.",
            variant: "default",
          });
          fetchAuditData();
        } else {
          setScanLogs((prev) => [...prev, `❌ Error: ${response.data?.message || "Crawl interrupted."}`]);
          toast({
            title: "Crawl Interrupt",
            description: response.data?.message || "Auditor bot could not complete successfully.",
            variant: "destructive",
          });
        }
        setRunning(false);
      }, logIntervals.length * 800 + 400);

    } catch (err) {
      setTimeout(() => {
        setScanLogs((prev) => [...prev, "❌ Connection Error: Backend server is busy or unreachable."]);
        toast({
          title: "Connection Failed",
          description: "Could not request audit run from the NestJS backend.",
          variant: "destructive",
        });
        setRunning(false);
      }, logIntervals.length * 800 + 400);
    }
  }

  // Save auditor schedule configurations
  async function saveAuditSettings() {
    try {
      const payload: SeoAuditSettings = {
        isAutoCheckEnabled: formAutoCheck,
        schedule: formAutoCheck ? formSchedule : "disabled",
        targetUrl: formTargetUrl.trim() === "" ? null : formTargetUrl.trim(),
      };

      const response = await api.post("/admin/seo-audit/settings", payload);
      if (response.data?.success) {
        setSettings(response.data.settings);
        setShowSettingsDrawer(false);
        toast({
          title: "Settings Saved",
          description: "SEO automated check parameters updated successfully.",
        });
      } else {
        toast({
          title: "Save Failed",
          description: response.data?.message || "Failed to update configurations.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Submission Error",
        description: "Failed to post updated settings to the admin controller.",
        variant: "destructive",
      });
    }
  }

  const toggleRow = (path: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400 border-green-500 bg-green-50 dark:bg-green-950/20";
    if (score >= 50) return "text-amber-600 dark:text-amber-400 border-amber-500 bg-amber-50 dark:bg-amber-950/20";
    return "text-red-600 dark:text-red-400 border-red-500 bg-red-50 dark:bg-red-950/20";
  };

  const getStatusBadge = (status: "SUCCESS" | "WARNING" | "ERROR") => {
    switch (status) {
      case "SUCCESS":
        return <Badge className="bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 font-medium">Indexable</Badge>;
      case "WARNING":
        return <Badge className="bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 font-medium">Needs Review</Badge>;
      case "ERROR":
        return <Badge className="bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 font-semibold animate-pulse">Critical Issue</Badge>;
    }
  };

  // Filter paths
  const filteredPages = report
    ? report.pages.filter((page) => {
        const matchesSearch = page.path.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (page.title && page.title.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStatus = statusFilter === "ALL" || page.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
    : [];

  return (
    <AdminGuard>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bot className="h-6 w-6 text-amber-500" />
                SEO Auditor & Optimizer Bot
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Platform health scanner simulating Googlebot and guests to intercept SEO-killing redirect loops and indexability faults.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFormAutoCheck(settings.isAutoCheckEnabled);
                  setFormSchedule(settings.schedule);
                  setFormTargetUrl(settings.targetUrl || "");
                  setShowSettingsDrawer(true);
                }}
                className="h-9 rounded-lg border-gray-200 dark:border-gray-700 touch-target"
              >
                <Settings className="h-4 w-4 mr-2 text-gray-500" />
                Automation Config
              </Button>
              <Button
                onClick={triggerCrawl}
                disabled={running}
                className="h-9 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium shadow-sm touch-target"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${running ? "animate-spin" : ""}`} />
                {running ? "Scanning Site..." : "Trigger Crawl Bot"}
              </Button>
            </div>
          </div>

          {/* Crawler active monitor logs overlay */}
          {running && (
            <Card className="border border-amber-200 dark:border-amber-950/60 bg-amber-50/20 dark:bg-amber-950/5 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
              <CardContent className="p-4 md:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="animate-bounce shrink-0 p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                      <Bot className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">SEO Bot Simulation active</p>
                      <p className="text-xs text-muted-foreground">Scanned via desktop & smartphone environments</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-amber-600">{currentProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${currentProgress}%` }}
                  />
                </div>
                <div className="bg-gray-950/90 text-gray-200 font-mono text-xs rounded-xl p-4 h-36 overflow-y-auto space-y-1.5 shadow-inner">
                  {scanLogs.map((log, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <span className="text-gray-500 shrink-0">[{new Date().toLocaleTimeString()}]</span>
                      <span className={log.startsWith("❌") ? "text-red-400" : log.startsWith("🎉") ? "text-green-400" : "text-gray-300"}>{log}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Visual Dashboard summary */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent mb-4"></div>
              <p className="text-muted-foreground text-sm font-medium">Fetching Auditor bot reports...</p>
            </div>
          ) : report ? (
            <>
              {/* Stat Gauges widgets */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Visual Dial Score Widget */}
                <Card className="premium-card md:col-span-1 flex flex-col justify-between">
                  <CardHeader className="p-4 pb-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Platform Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                    <div className="relative flex items-center justify-center h-28 w-28">
                      {/* Score Gradient Ring */}
                      <svg className="absolute w-full h-full transform -rotate-90">
                        <circle
                          cx="56"
                          cy="56"
                          r="48"
                          className="stroke-gray-100 dark:stroke-gray-800"
                          strokeWidth="8"
                          fill="transparent"
                        />
                        <circle
                          cx="56"
                          cy="56"
                          r="48"
                          className={
                            report.overallScore >= 90
                              ? "stroke-green-500"
                              : report.overallScore >= 50
                              ? "stroke-amber-500"
                              : "stroke-red-500"
                          }
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={301.6}
                          strokeDashoffset={301.6 - (301.6 * report.overallScore) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-3xl font-extrabold tracking-tight">{report.overallScore}</span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Score</span>
                      </div>
                    </div>
                    <div className="mt-4 text-xs font-semibold text-muted-foreground">
                      Average indexability score
                    </div>
                  </CardContent>
                </Card>

                {/* Checked pages widget */}
                <Card className="premium-card">
                  <CardContent className="p-6 flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">Indexable Pages</p>
                        <h3 className="text-3xl font-bold mt-2 text-green-600 dark:text-green-400">
                          {report.indexablePages} <span className="text-xs text-muted-foreground font-normal">/ {report.totalPages}</span>
                        </h3>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 text-green-600 rounded-xl">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-muted-foreground">
                      Public routes completely reachable by bots
                    </div>
                  </CardContent>
                </Card>

                {/* Redirected warnings widget */}
                <Card className="premium-card">
                  <CardContent className="p-6 flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">Redirected Pages</p>
                        <h3 className="text-3xl font-bold mt-2 text-amber-600 dark:text-amber-400">
                          {report.redirectPages} <span className="text-xs text-muted-foreground font-normal">/ {report.totalPages}</span>
                        </h3>
                      </div>
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-xl">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-muted-foreground">
                      Pages redirecting search crawlers elsewhere
                    </div>
                  </CardContent>
                </Card>

                {/* Critical Auth Redirect errors */}
                <Card className={report.criticalRedirects > 0 ? "premium-card border-red-300 dark:border-red-950 bg-red-50/10" : "premium-card"}>
                  <CardContent className="p-6 flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">Auth Redirect Errors</p>
                        <h3 className={`text-3xl font-bold mt-2 ${report.criticalRedirects > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                          {report.criticalRedirects}
                        </h3>
                      </div>
                      <div className={`p-3 rounded-xl ${report.criticalRedirects > 0 ? "bg-red-100 text-red-600 animate-pulse" : "bg-gray-100 text-gray-500"}`}>
                        <XCircle className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-muted-foreground font-medium">
                      {report.criticalRedirects > 0 ? (
                        <span className="text-red-500">🚨 Public pages redirecting Googlebot to Login!</span>
                      ) : (
                        <span>Zero auth redirect loops encountered</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Crawl history summary info alert */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 text-sm gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-muted-foreground">Last Audited:</span>
                  <span className="font-semibold">{new Date(report.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Crawl Host Target:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">{settings.targetUrl || "https://orivraa.com"}</span>
                </div>
              </div>

              {/* Detailed Report Table section */}
              <Card className="premium-card">
                <CardHeader className="p-4 md:p-6 pb-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">Audit Crawl Details</CardTitle>
                      <CardDescription>
                        Explore check logs across desktop/mobile UAs and content suggestions.
                      </CardDescription>
                    </div>
                    {/* Search & Filter tools */}
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search paths..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 h-9 rounded-lg border-gray-200 dark:border-gray-700 bg-transparent text-sm w-full touch-target"
                        />
                      </div>
                      <Select
                        value={statusFilter}
                        onValueChange={(v) => setStatusFilter(v as any)}
                      >
                        <SelectTrigger className="w-full sm:w-44 h-9 text-xs rounded-lg border-gray-200 dark:border-gray-700">
                          <SelectValue placeholder="Filter status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL" className="text-xs">All Pages</SelectItem>
                          <SelectItem value="SUCCESS" className="text-xs">Indexable (200 OK)</SelectItem>
                          <SelectItem value="WARNING" className="text-xs">Needs Review</SelectItem>
                          <SelectItem value="ERROR" className="text-xs">Critical Errors</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-gray-50/55 dark:bg-gray-900/30">
                        <TableRow>
                          <TableHead className="w-[10px]"></TableHead>
                          <TableHead className="text-sm font-semibold">URL Path</TableHead>
                          <TableHead className="text-sm font-semibold text-center w-[120px]">Score</TableHead>
                          <TableHead className="text-sm font-semibold w-[140px]">Indexing State</TableHead>
                          <TableHead className="text-sm font-semibold text-center w-[200px]">Crawl Agents (Smartphone / Desktop)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPages.map((page) => {
                          const isExpanded = !!expandedRows[page.path];
                          const gbotMobile = page.crawlResults.googlebotMobile;
                          const gbotDesktop = page.crawlResults.googlebotDesktop;

                          return (
                            <React.Fragment key={page.path}>
                              <TableRow
                                onClick={() => toggleRow(page.path)}
                                className="cursor-pointer hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                              >
                                <TableCell>
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                  )}
                                </TableCell>
                                <TableCell className="font-mono text-sm py-4">
                                  <div className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-gray-100">
                                    {page.path}
                                    <a
                                      href={(settings.targetUrl || "https://orivraa.com") + page.path}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-gray-400 hover:text-amber-500 transition-colors shrink-0"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </div>
                                  {page.title && (
                                    <p className="text-xs text-muted-foreground truncate max-w-[400px] mt-0.5 font-sans font-normal">
                                      {page.title}
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell className="text-center font-bold">
                                  <span className={`px-2.5 py-1 rounded-full text-xs border font-mono ${getScoreColor(page.score)}`}>
                                    {page.score}%
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(page.status)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-6">
                                    {/* Googlebot Mobile UA results */}
                                    <div className="flex flex-col items-center">
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Mobile Bot</span>
                                      {gbotMobile.status === 200 ? (
                                        <span className="text-green-500" title="200 OK"><CheckCircle2 className="h-5 w-5" /></span>
                                      ) : gbotMobile.status >= 300 && gbotMobile.status < 400 ? (
                                        <span className={gbotMobile.redirectTarget?.includes("/auth/login") ? "text-red-500 animate-ping" : "text-amber-500"} title={`Redirects to ${gbotMobile.redirectTarget}`}><AlertTriangle className="h-5 w-5" /></span>
                                      ) : (
                                        <span className="text-red-500" title={`Error status: ${gbotMobile.status}`}><XCircle className="h-5 w-5" /></span>
                                      )}
                                    </div>

                                    {/* Googlebot Desktop UA results */}
                                    <div className="flex flex-col items-center">
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Desktop Bot</span>
                                      {gbotDesktop.status === 200 ? (
                                        <span className="text-green-500" title="200 OK"><CheckCircle2 className="h-5 w-5" /></span>
                                      ) : gbotDesktop.status >= 300 && gbotDesktop.status < 400 ? (
                                        <span className={gbotDesktop.redirectTarget?.includes("/auth/login") ? "text-red-500 animate-ping" : "text-amber-500"} title={`Redirects to ${gbotDesktop.redirectTarget}`}><AlertTriangle className="h-5 w-5" /></span>
                                      ) : (
                                        <span className="text-red-500" title={`Error status: ${gbotDesktop.status}`}><XCircle className="h-5 w-5" /></span>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>

                              {/* Expandable Recommendations drawer content */}
                              {isExpanded && (
                                <TableRow className="bg-gray-50/40 dark:bg-gray-900/10 hover:bg-transparent">
                                  <TableCell colSpan={5} className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-800">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-300">
                                      {/* Technical Crawl tracing */}
                                      <div className="md:col-span-1 space-y-4">
                                        <div className="bg-white dark:bg-gray-850 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                          <h4 className="font-bold text-xs uppercase text-gray-500 tracking-wider mb-3">Crawl Tracing Details</h4>
                                          <div className="space-y-2.5 text-sm">
                                            <div className="flex justify-between items-center py-1 border-b border-gray-50 dark:border-gray-800/40">
                                              <span className="text-muted-foreground">Googlebot Smartphone</span>
                                              <span className="font-semibold font-mono text-xs">{gbotMobile.status} {gbotMobile.redirectTarget ? "Redirect" : "OK"}</span>
                                            </div>
                                            {gbotMobile.redirectTarget && (
                                              <div className="text-[11px] p-2 bg-amber-500/10 text-amber-600 rounded-lg border border-amber-500/20 break-all font-mono">
                                                Redirect Target: {gbotMobile.redirectTarget}
                                              </div>
                                            )}
                                            <div className="flex justify-between items-center py-1 border-b border-gray-50 dark:border-gray-800/40">
                                              <span className="text-muted-foreground">Standard Chrome Browser</span>
                                              <span className="font-semibold font-mono text-xs">
                                                {page.crawlResults.browserDesktop.status} {page.crawlResults.browserDesktop.redirectTarget ? "Redirect" : "OK"}
                                              </span>
                                            </div>
                                            {page.crawlResults.browserDesktop.redirectTarget && (
                                              <div className="text-[11px] p-2 bg-amber-500/10 text-amber-600 rounded-lg border border-amber-500/20 break-all font-mono">
                                                Redirect Target: {page.crawlResults.browserDesktop.redirectTarget}
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        <div className="bg-white dark:bg-gray-850 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                          <h4 className="font-bold text-xs uppercase text-gray-500 tracking-wider mb-3">Metadata Inspected</h4>
                                          <div className="space-y-2 text-xs font-mono">
                                            <div>
                                              <span className="text-muted-foreground block font-sans mb-0.5">Title Tag</span>
                                              <span className="font-semibold text-gray-900 dark:text-gray-100 break-all">{page.title || "None"}</span>
                                            </div>
                                            <div>
                                              <span className="text-muted-foreground block font-sans mb-0.5">Description Tag</span>
                                              <span className="font-semibold text-gray-900 dark:text-gray-100 break-all">{page.description || "None"}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 pt-1.5">
                                              <div>
                                                <span className="text-muted-foreground block font-sans">H1 tags</span>
                                                <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{page.h1Count}</span>
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground block font-sans">Word count</span>
                                                <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{page.wordCount}</span>
                                              </div>
                                            </div>
                                            <div className="pt-1.5">
                                              <span className="text-muted-foreground block font-sans">Robots Tag</span>
                                              <span className="font-semibold text-gray-900 dark:text-gray-100">{page.robots || "index, follow"}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Actionable recommendations compiler list */}
                                      <div className="md:col-span-2 space-y-3">
                                        <div className="bg-white dark:bg-gray-850 p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm h-full flex flex-col">
                                          <div className="flex items-center gap-1.5 mb-4">
                                            <Sparkles className="h-4.5 w-4.5 text-amber-500" />
                                            <h4 className="font-bold text-sm">SEO & Content Improvements</h4>
                                          </div>
                                          {page.recommendations.length > 0 ? (
                                            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-72 pr-2">
                                              {page.recommendations.map((rec, rIdx) => {
                                                const isCritical = rec.startsWith("❌");
                                                const isWarning = rec.startsWith("⚠️");
                                                return (
                                                  <div
                                                    key={rIdx}
                                                    className={`p-3 rounded-xl text-xs leading-relaxed flex gap-2.5 items-start ${
                                                      isCritical
                                                        ? "bg-red-50 dark:bg-red-950/15 border border-red-200 dark:border-red-950/40 text-red-900 dark:text-red-400"
                                                        : isWarning
                                                        ? "bg-amber-50 dark:bg-amber-950/15 border border-amber-200 dark:border-amber-950/40 text-amber-900 dark:text-amber-400"
                                                        : "bg-blue-50 dark:bg-blue-950/15 border border-blue-200 dark:border-blue-950/40 text-blue-900 dark:text-blue-400"
                                                    }`}
                                                  >
                                                    {isCritical ? (
                                                      <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                                                    ) : isWarning ? (
                                                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                                                    ) : (
                                                      <Info className="h-4 w-4 shrink-0 text-blue-500" />
                                                    )}
                                                    <div>{rec.replace(/^[❌⚠️💡]\s\*\*(.*?)\*\*:\s/, "")}</div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ) : (
                                            <div className="flex flex-col items-center justify-center flex-1 text-center py-10">
                                              <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
                                              <p className="font-semibold text-sm">Excellent SEO Optimization!</p>
                                              <p className="text-xs text-muted-foreground mt-0.5">This URL meets all indexing, title, descriptive and formatting metrics.</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })}
                        {filteredPages.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="py-10 text-center text-muted-foreground text-sm">
                              No pages found matching search criteria.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="rounded-2xl border border-dashed py-20 text-center">
              <CardContent className="flex flex-col items-center">
                <div className="p-4 bg-amber-500/10 rounded-2xl mb-4">
                  <Bot className="h-10 w-10 text-amber-500" />
                </div>
                <h3 className="font-bold text-lg">No SEO audits logged yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1.5">
                  Launch the first site indexability crawl scan using the manual trigger.
                </p>
                <Button
                  onClick={triggerCrawl}
                  disabled={running}
                  className="mt-6 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Perform First Audit
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Configurations settings drawer */}
        {showSettingsDrawer && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-end animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold">Auditor Bot Configuration</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Adjust check schedules and local crawling overrides.</p>
                </div>

                <div className="space-y-5">
                  {/* Target URL override */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Crawl target Host override</label>
                    <Input
                      placeholder="e.g. https://orivraa.com"
                      value={formTargetUrl}
                      onChange={(e) => setFormTargetUrl(e.target.value)}
                      className="h-9 rounded-lg border-gray-200 dark:border-gray-700 bg-transparent text-sm touch-target"
                    />
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Leave blank to auto-detect using backend environment variables (defaults to production <code>https://orivraa.com</code>).
                    </p>
                  </div>

                  {/* Enable Switch */}
                  <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="space-y-0.5">
                      <span className="text-sm font-semibold">Automated Checking</span>
                      <p className="text-xs text-muted-foreground">Periodically check indexability status</p>
                    </div>
                    <Switch
                      checked={formAutoCheck}
                      onCheckedChange={(checked) => setFormAutoCheck(checked)}
                    />
                  </div>

                  {/* Schedule Select */}
                  {formAutoCheck && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                      <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Automatic Audit Schedule</label>
                      <Select
                        value={formSchedule}
                        onValueChange={(v) => setFormSchedule(v as any)}
                      >
                        <SelectTrigger className="w-full h-9 text-xs rounded-lg border-gray-200 dark:border-gray-700">
                          <SelectValue placeholder="Select intervals" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily" className="text-xs">Daily check (Midnight)</SelectItem>
                          <SelectItem value="weekly" className="text-xs">Weekly check (Sundays)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        The bot will regularly crawl public sitemaps and push alarms to your notifications board if crawl locks are triggered.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-6 border-t border-gray-100 dark:border-gray-800 shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setShowSettingsDrawer(false)}
                  className="w-1/2 h-9 rounded-lg border-gray-200 dark:border-gray-700 touch-target"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveAuditSettings}
                  className="w-1/2 h-9 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-sm touch-target"
                >
                  Save settings
                </Button>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </AdminGuard>
  );
}
