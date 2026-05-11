"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { BlogHighlightsSection } from "@/components/marketing/BlogHighlightsSection";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { T } from "@/components/ui/T";
import { api } from "@/lib/api";
import {
    ArrowDownTrayIcon,
    ComputerDesktopIcon,
    CpuChipIcon,
    ServerIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  isLatest: boolean;
  minOs: string | null;
  minRam: string | null;
  minDisk: string | null;
  architecture: string | null;
  publishedAt: string;
  downloadCount: number;
}

function detectPlatform(): "WINDOWS" | "MACOS" | "LINUX" {
  if (typeof navigator === "undefined") return "WINDOWS";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "MACOS";
  if (ua.includes("linux")) return "LINUX";
  return "WINDOWS";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/** Round down to nearest order-of-magnitude milestone, show as "10+", "100+" etc. */
function formatDownloadCount(n: number): string | null {
  if (n < 10) return null;
  const magnitude = Math.pow(10, Math.floor(Math.log10(n)));
  const rounded = Math.floor(n / magnitude) * magnitude;
  return `${rounded.toLocaleString()}+`;
}

async function trackDownloadClick(id: string) {
  try {
    await api.post(`/releases/track-download/${id}`);
  } catch {
    // non-critical — never block the download
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const platformLabel = {
  WINDOWS: "Windows",
  MACOS: "macOS",
  LINUX: "Linux",
};

const platformIcon = {
  WINDOWS: "🪟",
  MACOS: "🍎",
  LINUX: "🐧",
};

export default function DownloadPage() {
  const [latestReleases, setLatestReleases] = useState<Release[]>([]);
  const [olderReleases, setOlderReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const detectedPlatform = useMemo(detectPlatform, []);
  const [selectedPlatform, setSelectedPlatform] = useState(detectedPlatform);

  useEffect(() => {
    async function fetchReleases() {
      try {
        const [latestRes, windowsRes, macRes] = await Promise.all([
          api.get("/releases/latest"),
          api.get("/releases/platform/windows?limit=6"),
          api.get("/releases/platform/macos?limit=6"),
        ]);
        setLatestReleases(latestRes.data);

        const allOlder = [
          ...(windowsRes.data || []),
          ...(macRes.data || []),
        ].filter((r: Release) => !r.isLatest);
        setOlderReleases(allOlder);
      } catch (err) {
        console.error("Failed to fetch releases:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReleases();
  }, []);

  const primaryRelease = latestReleases.find(
    (r) => r.platform === selectedPlatform,
  );
  const otherLatest = latestReleases.filter(
    (r) => r.platform !== selectedPlatform,
  );
  const platformOlder = olderReleases
    .filter((r) => r.platform === selectedPlatform)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, 5);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold-500/5 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-3xl mx-auto"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-500/10 text-gold-600 dark:text-gold-400 text-sm font-medium mb-6">
                <ComputerDesktopIcon className="w-4 h-4" />
                <T>Desktop POS for jewellery shops</T>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                <T>Desktop POS &amp; offline mode</T>{" "}
                <span className="bg-gradient-to-r from-gold-500 to-gold-700 dark:from-gold-400 dark:to-gold-600 bg-clip-text text-transparent">
                  <T>for your shop counter</T>
                </span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-2">
                <T>
                  Bill at the counter even when the internet is down. Live
                  gold rates, hallmark/HUID-ready invoices, barcode scanning,
                  and automatic sync to the cloud when you&apos;re back online.
                </T>
              </p>
              <p className="text-sm text-muted-foreground/60">
                {detectedPlatform === "WINDOWS"
                  ? ""
                  : detectedPlatform === "MACOS"
                    ? ""
                    : ""}
                {detectedPlatform === "WINDOWS" && (
                  <T>We detected you're on Windows</T>
                )}
                {detectedPlatform === "MACOS" && (
                  <T>We detected you're on macOS</T>
                )}
                {detectedPlatform === "LINUX" && (
                  <T>We detected you're on Linux</T>
                )}
              </p>
            </motion.div>

            {/* Primary Download Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-10 max-w-lg mx-auto"
            >
              {loading ? (
                <Card className="border-gold-500/20">
                  <CardContent className="flex flex-col items-center py-12 gap-4">
                    <div className="w-10 h-10 rounded-full border-3 border-transparent border-t-gold-500 border-r-gold-300 animate-spin" />
                    <p className="text-sm text-muted-foreground">
                      <T>Loading releases...</T>
                    </p>
                  </CardContent>
                </Card>
              ) : primaryRelease ? (
                <Card className="border-gold-500/20 shadow-lg shadow-gold-500/5">
                  <CardHeader className="text-center pb-2">
                    <div className="text-4xl mb-2">
                      {platformIcon[selectedPlatform]}
                    </div>
                    <CardTitle className="text-xl">
                      <T>{`Orivraa for ${platformLabel[selectedPlatform]}`}</T>
                    </CardTitle>
                    <CardDescription>
                      Version {primaryRelease.version} &middot;{" "}
                      {primaryRelease.downloadCount > 0 && formatDownloadCount(primaryRelease.downloadCount) && (
                        <span className="ml-1 text-gold-600 dark:text-gold-400 font-medium">
                          {formatDownloadCount(primaryRelease.downloadCount)} downloads
                        </span>
                      )}
                      {" · "}{formatDate(primaryRelease.publishedAt)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-4 pb-6">
                    {primaryRelease.downloadUrl ? (
                      <Button
                        size="lg"
                        className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white px-8 gap-2"
                        onClick={async () => {
                          await trackDownloadClick(primaryRelease.id);
                          window.location.href = primaryRelease.downloadUrl!;
                        }}
                      >
                          <ArrowDownTrayIcon className="w-5 h-5" />
                          <T>Download</T> v{primaryRelease.version}
                          {primaryRelease.fileSize
                            ? ` (${formatBytes(primaryRelease.fileSize)})`
                            : ""}
                      </Button>
                    ) : (
                      <Button size="lg" disabled className="gap-2">
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        <T>Coming Soon</T>
                      </Button>
                    )}

                    {primaryRelease.fileName && (
                      <p className="text-xs text-muted-foreground">
                        {primaryRelease.fileName}
                      </p>
                    )}

                    {/* Platform switcher */}
                    <div className="flex items-center gap-2 mt-2">
                      {(["WINDOWS", "MACOS"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setSelectedPlatform(p)}
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            selectedPlatform === p
                              ? "bg-gold-500/20 text-gold-600 dark:text-gold-400 font-medium"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {platformIcon[p]} {platformLabel[p]}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-gold-500/20">
                  <CardContent className="flex flex-col items-center py-12 gap-4">
                    <ComputerDesktopIcon className="w-12 h-12 text-muted-foreground/40" />
                    <p className="text-muted-foreground">
                      <T>
                        {`No release available for ${platformLabel[selectedPlatform]} yet.`}
                      </T>
                    </p>
                    <p className="text-sm text-muted-foreground/60">
                      <T>Try switching platforms or check back later.</T>
                    </p>
                    {/* Platform switcher — always visible so users can switch back */}
                    <div className="flex items-center gap-2 mt-2">
                      {(["WINDOWS", "MACOS"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setSelectedPlatform(p)}
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            selectedPlatform === p
                              ? "bg-gold-500/20 text-gold-600 dark:text-gold-400 font-medium"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {platformIcon[p]} {platformLabel[p]}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </div>
        </section>

        {/* System Requirements */}
        {primaryRelease && (
          <section className="py-12 border-t border-border/50">
            <div className="container mx-auto px-4 max-w-3xl">
              <h2 className="text-2xl font-bold text-center mb-8">
                <T>System Requirements</T>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-border/50">
                  <CardContent className="flex flex-col items-center py-6 gap-2">
                    <ServerIcon className="w-8 h-8 text-gold-500" />
                    <p className="font-medium text-sm">
                      <T>Operating System</T>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {primaryRelease.minOs || "Windows 10+ / macOS 12+"}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="flex flex-col items-center py-6 gap-2">
                    <CpuChipIcon className="w-8 h-8 text-gold-500" />
                    <p className="font-medium text-sm">
                      <T>Memory</T>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {primaryRelease.minRam || "4 GB RAM"}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="flex flex-col items-center py-6 gap-2">
                    <ArrowDownTrayIcon className="w-8 h-8 text-gold-500" />
                    <p className="font-medium text-sm">
                      <T>Disk Space</T>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {primaryRelease.minDisk || "200 MB"}
                    </p>
                  </CardContent>
                </Card>
              </div>
              {primaryRelease.architecture && (
                <p className="text-xs text-center text-muted-foreground mt-4">
                  <T>Architecture:</T> {primaryRelease.architecture}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Features */}
        <section className="py-16 border-t border-border/50">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold text-center mb-10">
              <T>Why Desktop?</T>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  icon: "⚡",
                  title: "Faster Performance",
                  desc: "Native app speed with instant startup and smooth navigation.",
                },
                {
                  icon: "📴",
                  title: "Offline Access",
                  desc: "View orders, products, and customer data even without internet. Changes sync automatically.",
                },
                {
                  icon: "🔔",
                  title: "System Notifications",
                  desc: "Get notified about new orders, messages, and RFQ requests even when the app is minimized.",
                },
                {
                  icon: "🔐",
                  title: "Seamless Google Sign-in",
                  desc: "Sign in using your browser's saved Google session — no re-entering passwords.",
                },
                {
                  icon: "🔄",
                  title: "Auto Updates",
                  desc: "Always stay on the latest version. Updates download and install in the background.",
                },
                {
                  icon: "💾",
                  title: "Local Data Sync",
                  desc: "Work on drafts offline. Everything syncs when you're back online.",
                },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="border-border/50 h-full hover:border-gold-500/20 transition-colors">
                    <CardContent className="py-5 flex gap-4">
                      <span className="text-2xl shrink-0">{feature.icon}</span>
                      <div>
                        <p className="font-semibold text-sm">
                          <T>{feature.title}</T>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          <T>{feature.desc}</T>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <BlogHighlightsSection
          title="Learn the Billing and Tax Workflow Too"
          description="Visitors checking the desktop app are often also deciding how to handle billing, GST, and month-end reporting. These guides explain where jewellers save time and money."
          slugs={[
            "best-billing-software-for-jewellery-shops-india-2026",
            "how-tax-reports-save-jewellery-traders-money",
            "jewellery-gst-billing-guide-india",
          ]}
          ctaLabel="Open the blog"
        />

        {/* Older Versions */}
        {platformOlder.length > 0 && (
          <section className="py-12 border-t border-border/50">
            <div className="container mx-auto px-4 max-w-2xl">
              <h2 className="text-xl font-bold mb-6">
                <T>Previous Versions</T>
              </h2>
              <div className="space-y-3">
                {platformOlder.map((release) => (
                  <div
                    key={release.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        v{release.version}{" "}
                        <span className="text-xs text-muted-foreground ml-1">
                          {
                            platformLabel[
                              release.platform as keyof typeof platformLabel
                            ]
                          }
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(release.publishedAt)}
                        {release.fileSize
                          ? ` · ${formatBytes(release.fileSize)}`
                          : ""}
                      </p>
                    </div>
                    {release.downloadUrl ? (
                      <Button variant="outline" size="sm" asChild>
                        <a href={release.downloadUrl} download>
                          <T>Download</T>
                        </a>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        <T>Unavailable</T>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Changelog Link */}
        <section className="py-12 border-t border-border/50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-xl font-bold mb-3">
              <T>Changelog</T>
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              <T>
                See what&apos;s new in every release — desktop and web combined.
              </T>
            </p>
            <Button variant="outline" asChild>
              <Link href="/download/changelog">
                <T>View Full Changelog</T>
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <DynamicFooter />
    </>
  );
}
