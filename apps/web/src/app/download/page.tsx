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
    ArrowPathIcon,
    BoltIcon,
    CpuChipIcon,
    ComputerDesktopIcon,
    CloudArrowUpIcon,
    BellAlertIcon,
    LockClosedIcon,
    ArrowTopRightOnSquareIcon,
    CircleStackIcon,
    ServerIcon,
    CheckCircleIcon,
    CommandLineIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

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

type Platform = "WINDOWS" | "MACOS" | "LINUX";

function detectPlatform(): Platform {
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
    // non-critical
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const GITHUB_REPO = "aakash-priyadarshi/gold-shop-app";

function githubReleaseUrl(version: string, fileName: string | null): string | null {
  if (!fileName) return null;
  return `https://github.com/${GITHUB_REPO}/releases/download/desktop-v${version}/${fileName}`;
}

function resolveDownloadUrl(release: Release): string | null {
  if (release.isLatest && release.downloadUrl) {
    return release.downloadUrl;
  }
  return githubReleaseUrl(release.version, release.fileName) || release.downloadUrl;
}

const platformLabel: Record<Platform, string> = {
  WINDOWS: "Windows",
  MACOS: "macOS",
  LINUX: "Linux",
};

const platformIcon: Record<Platform, string> = {
  WINDOWS: "🪟",
  MACOS: "🍎",
  LINUX: "🐧",
};

// ─── Animation variants ────────────────────────────────────
const containerStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemSlideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const },
  },
};

const cardHover = {
  scale: 1.02,
  transition: { duration: 0.2, ease: [0.25, 0.4, 0.25, 1] as const },
};

// ─── Floating particles background ─────────────────────────
function FloatingParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 4 + Math.random() * 8,
        duration: 8 + Math.random() * 12,
        delay: Math.random() * 5,
      })),
    [],
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-gold-500/10"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 0.4, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ─── Platform selector with animated indicator ─────────────
function PlatformSelector({
  selected,
  onSelect,
}: {
  selected: Platform;
  onSelect: (p: Platform) => void;
}) {
  const platforms: Platform[] = ["WINDOWS", "MACOS"];
  return (
    <div className="relative inline-flex items-center gap-1 p-1 rounded-full bg-muted/50 border border-border/50">
      {platforms.map((p) => (
        <button
          key={p}
          onClick={() => onSelect(p)}
          className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors z-10 ${
            selected === p
              ? "text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {selected === p && (
            <motion.div
              layoutId="platform-pill"
              className="absolute inset-0 rounded-full bg-gradient-to-r from-gold-500 to-gold-600"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            <span>{platformIcon[p]}</span>
            {platformLabel[p]}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Download card with animated progress ──────────────────
function DownloadCard({
  release,
  platform,
  onTrack,
}: {
  release: Release | undefined;
  platform: Platform;
  onTrack: (id: string) => void;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!release?.downloadUrl) return;
    setDownloading(true);
    await onTrack(release.id);
    window.location.href = release.downloadUrl;
    setTimeout(() => setDownloading(false), 3000);
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={platform}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Card className="border-gold-500/20 shadow-xl shadow-gold-500/10 overflow-hidden relative">
          {/* Gradient glow background */}
          <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 via-transparent to-gold-700/5 pointer-events-none" />

          <CardHeader className="text-center pb-2 relative z-10">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
              className="text-5xl mb-3 inline-block"
            >
              {platformIcon[platform]}
            </motion.div>
            <CardTitle className="text-2xl font-bold">
              <T>{`Orivraa for ${platformLabel[platform]}`}</T>
            </CardTitle>
            {release ? (
              <CardDescription className="text-base">
                <span className="font-semibold text-gold-600 dark:text-gold-400">
                  v{release.version}
                </span>
                {release.downloadCount > 0 &&
                  formatDownloadCount(release.downloadCount) && (
                    <span className="ml-2 text-gold-600 dark:text-gold-400">
                      · {formatDownloadCount(release.downloadCount)} downloads
                    </span>
                  )}
                <span className="ml-2">· {formatDate(release.publishedAt)}</span>
              </CardDescription>
            ) : (
              <CardDescription className="text-base">
                <T>Coming soon</T>
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-4 pb-8 relative z-10">
            {release?.downloadUrl ? (
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white px-10 py-6 text-lg gap-3 shadow-lg shadow-gold-500/30 relative overflow-hidden"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <ArrowPathIcon className="w-6 h-6" />
                    </motion.div>
                  ) : (
                    <ArrowDownTrayIcon className="w-6 h-6" />
                  )}
                  <T>Download</T> v{release.version}
                  {release.fileSize ? ` (${formatBytes(release.fileSize)})` : ""}
                </Button>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Button size="lg" disabled className="gap-2 opacity-60">
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  <T>Coming Soon</T>
                </Button>
                <p className="text-xs text-muted-foreground/60 max-w-xs text-center">
                  <T>We're working on bringing Orivraa to this platform. Check back soon!</T>
                </p>
              </div>
            )}

            {release?.fileName && (
              <p className="text-xs text-muted-foreground font-mono">
                {release.fileName}
              </p>
            )}

            {/* GitHub mirror */}
            {release && (
              <a
                href={`https://github.com/${GITHUB_REPO}/releases/tag/desktop-v${release.version}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-gold-600 dark:hover:text-gold-400 transition-colors underline underline-offset-2 flex items-center gap-1"
              >
                <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                <T>Mirror download on GitHub</T>
              </a>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Feature card ──────────────────────────────────────────
function FeatureCard({
  icon: Icon,
  title,
  desc,
  index,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  index: number;
}) {
  return (
    <motion.div
      variants={itemSlideUp}
      whileHover={cardHover}
    >
      <Card className="border-border/50 h-full hover:border-gold-500/30 hover:shadow-lg hover:shadow-gold-500/5 transition-all duration-300 group">
        <CardContent className="py-6 flex gap-4">
          <div className="shrink-0 w-12 h-12 rounded-xl bg-gold-500/10 flex items-center justify-center group-hover:bg-gold-500/20 transition-colors">
            <Icon className="w-6 h-6 text-gold-600 dark:text-gold-400" />
          </div>
          <div>
            <p className="font-semibold text-sm mb-1">
              <T>{title}</T>
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <T>{desc}</T>
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── System requirement card ───────────────────────────────
function RequirementCard({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.4 }}
    >
      <Card className="border-border/50 hover:border-gold-500/20 transition-colors">
        <CardContent className="flex flex-col items-center py-8 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gold-500/10 flex items-center justify-center">
            <Icon className="w-7 h-7 text-gold-500" />
          </div>
          <p className="font-medium text-sm">
            <T>{label}</T>
          </p>
          <p className="text-xs text-muted-foreground text-center">
            {value}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Older version row ─────────────────────────────────────
function OlderVersionRow({ release, index }: { release: Release; index: number }) {
  const url = resolveDownloadUrl(release);
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-gold-500/20 hover:bg-gold-500/5 transition-all duration-200 group">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center text-lg">
            {platformIcon[release.platform as Platform] || "📦"}
          </div>
          <div>
            <p className="font-medium text-sm flex items-center gap-2">
              v{release.version}
              <span className="text-xs text-muted-foreground">
                {platformLabel[release.platform as Platform] || release.platform}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(release.publishedAt)}
              {release.fileSize ? ` · ${formatBytes(release.fileSize)}` : ""}
            </p>
          </div>
        </div>
        {url ? (
          <Button variant="outline" size="sm" asChild className="group-hover:border-gold-500/30">
            <a href={url} download>
              <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
              <T>Download</T>
            </a>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <T>Unavailable</T>
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════════
export default function DownloadPage() {
  const [latestReleases, setLatestReleases] = useState<Release[]>([]);
  const [olderReleases, setOlderReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const detectedPlatform = useMemo(detectPlatform, []);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(detectedPlatform);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85, 1], [1, 1, 0]);

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
  const platformOlder = olderReleases
    .filter((r) => r.platform === selectedPlatform)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, 5);

  const features = [
    {
      icon: BoltIcon,
      title: "Faster Performance",
      desc: "Native app speed with instant startup and smooth navigation — no browser tab needed.",
    },
    {
      icon: CloudArrowUpIcon,
      title: "Offline Access",
      desc: "View orders, products, and customer data even without internet. Changes sync automatically when you're back online.",
    },
    {
      icon: BellAlertIcon,
      title: "System Notifications",
      desc: "Get notified about new orders, messages, and RFQ requests even when the app is minimized.",
    },
    {
      icon: LockClosedIcon,
      title: "Seamless Google Sign-in",
      desc: "Sign in using your browser's saved Google session — no re-entering passwords.",
    },
    {
      icon: ArrowPathIcon,
      title: "Auto Updates",
      desc: "Always stay on the latest version. Updates download and install automatically — just restart to apply.",
    },
    {
      icon: CircleStackIcon,
      title: "Local Data Sync",
      desc: "Work on drafts offline. Everything syncs when you're back online — never lose a bill to a bad connection.",
    },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        {/* ═══ Hero Section ═══ */}
        <section ref={heroRef} className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28">
          {/* Animated background gradients */}
          <div className="absolute inset-0 pointer-events-none">
            <motion.div
              className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-gold-500/8 rounded-full blur-3xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gold-700/8 rounded-full blur-3xl"
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          <FloatingParticles />

          <motion.div
            style={{ y: heroY, opacity: heroOpacity }}
            className="container mx-auto px-4 relative z-10"
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="text-center max-w-3xl mx-auto"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-500/10 text-gold-600 dark:text-gold-400 text-sm font-medium mb-6 border border-gold-500/20"
              >
                <ComputerDesktopIcon className="w-4 h-4" />
                <T>Desktop POS for jewellery shops</T>
                <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse" />
              </motion.div>

              {/* Headline */}
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
                <T>Desktop POS &amp; offline mode</T>
                <br />
                <span className="bg-gradient-to-r from-gold-500 via-gold-600 to-gold-700 dark:from-gold-400 dark:via-gold-500 dark:to-gold-600 bg-clip-text text-transparent">
                  <T>for your shop counter</T>
                </span>
              </h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-lg text-muted-foreground max-w-xl mx-auto mb-3"
              >
                <T>
                  Bill at the counter even when the internet is down. Live
                  gold rates, hallmark/HUID-ready invoices, barcode scanning,
                  and automatic sync to the cloud when you're back online.
                </T>
              </motion.p>

              {/* Platform detected hint */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-muted-foreground/60 mb-8"
              >
                {detectedPlatform === "WINDOWS" && <T>We detected you're on Windows</T>}
                {detectedPlatform === "MACOS" && <T>We detected you're on macOS</T>}
                {detectedPlatform === "LINUX" && <T>We detected you're on Linux</T>}
              </motion.p>
            </motion.div>

            {/* Platform selector */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex justify-center mb-8"
            >
              <PlatformSelector selected={selectedPlatform} onSelect={setSelectedPlatform} />
            </motion.div>

            {/* Download card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="max-w-lg mx-auto"
            >
              {loading ? (
                <Card className="border-gold-500/20">
                  <CardContent className="flex flex-col items-center py-16 gap-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                      className="w-12 h-12 rounded-full border-3 border-transparent border-t-gold-500 border-r-gold-300"
                    />
                    <p className="text-sm text-muted-foreground">
                      <T>Loading releases...</T>
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <DownloadCard
                  release={primaryRelease}
                  platform={selectedPlatform}
                  onTrack={trackDownloadClick}
                />
              )}
            </motion.div>

            {/* Quick stats */}
            {!loading && latestReleases.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex justify-center gap-8 mt-12 text-center"
              >
                {[
                  { label: "Platforms", value: "2" },
                  { label: "Auto-update", value: "Yes" },
                  { label: "Offline mode", value: "Yes" },
                ].map((stat, i) => (
                  <div key={i}>
                    <p className="text-2xl font-bold bg-gradient-to-r from-gold-500 to-gold-700 bg-clip-text text-transparent">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <T>{stat.label}</T>
                    </p>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </section>

        {/* ═══ System Requirements ═══ */}
        {primaryRelease && (
          <section className="py-16 border-t border-border/50">
            <div className="container mx-auto px-4 max-w-3xl">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-2xl font-bold text-center mb-10"
              >
                <T>System Requirements</T>
              </motion.h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <RequirementCard
                  icon={ServerIcon}
                  label="Operating System"
                  value={primaryRelease.minOs || "Windows 10+ / macOS 12+"}
                  delay={0}
                />
                <RequirementCard
                  icon={CpuChipIcon}
                  label="Memory"
                  value={primaryRelease.minRam || "4 GB RAM"}
                  delay={0.1}
                />
                <RequirementCard
                  icon={CircleStackIcon}
                  label="Disk Space"
                  value={primaryRelease.minDisk || "200 MB"}
                  delay={0.2}
                />
              </div>
              {primaryRelease.architecture && (
                <motion.p
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="text-xs text-center text-muted-foreground mt-6"
                >
                  <T>Architecture:</T> {primaryRelease.architecture}
                </motion.p>
              )}
            </div>
          </section>
        )}

        {/* ═══ Features ═══ */}
        <section className="py-20 border-t border-border/50">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-3">
                <T>Why Desktop?</T>
              </h2>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                <T>Faster, offline-ready, and built for the jewellery shop counter.</T>
              </p>
            </motion.div>

            <motion.div
              variants={containerStagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              className="grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              {features.map((feature, i) => (
                <FeatureCard key={i} index={i} {...feature} />
              ))}
            </motion.div>
          </div>
        </section>

        {/* ═══ Auto-update highlight banner ═══ */}
        <section className="py-16 border-t border-border/50">
          <div className="container mx-auto px-4 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-gold-500/20 bg-gradient-to-br from-gold-500/5 to-transparent overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl" />
                <CardContent className="py-8 px-8 relative z-10">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/30">
                      <ArrowPathIcon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                        <T>Automatic Updates</T>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-medium">
                          v0.2.0+
                        </span>
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        <T>
                          Orivraa Desktop now checks for updates automatically on startup.
                          When a new version is available, you'll get a notification —
                          just click "Update Now" and the app downloads and installs
                          the update in the background. All you need to do is restart.
                          No manual downloads, no reinstall — ever.
                        </T>
                      </p>
                      <div className="flex flex-wrap gap-3 mt-4">
                        {[
                          "R2 CDN primary",
                          "GitHub fallback",
                          "Signed updates",
                          "Progress bar",
                        ].map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-3 py-1 rounded-full bg-muted/50 text-muted-foreground border border-border/50"
                          >
                            <CheckCircleIcon className="w-3 h-3 inline mr-1 text-green-500" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
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

        {/* ═══ Older Versions ═══ */}
        {platformOlder.length > 0 && (
          <section className="py-16 border-t border-border/50">
            <div className="container mx-auto px-4 max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-8"
              >
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <CommandLineIcon className="w-5 h-5 text-gold-500" />
                  <T>Previous Versions</T>
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  <T>Older versions are served from GitHub Releases.</T>
                </p>
              </motion.div>
              <div className="space-y-3">
                {platformOlder.map((release, i) => (
                  <OlderVersionRow key={release.id} release={release} index={i} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══ Changelog Link ═══ */}
        <section className="py-16 border-t border-border/50">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="container mx-auto px-4 text-center"
          >
            <h2 className="text-xl font-bold mb-3">
              <T>Changelog</T>
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              <T>
                See what's new in every release — desktop and web combined.
              </T>
            </p>
            <Button variant="outline" asChild className="gap-2">
              <Link href="/download/changelog">
                <CommandLineIcon className="w-4 h-4" />
                <T>View Full Changelog</T>
              </Link>
            </Button>
          </motion.div>
        </section>
      </main>
      <DynamicFooter />
    </>
  );
}
