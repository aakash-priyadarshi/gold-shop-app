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
  ShieldExclamationIcon,
  CheckIcon,
  SparklesIcon,
  QrCodeIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion, useScroll, useTransform, useMotionValue } from "framer-motion";
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

// ─── Platform SVG Icons ───────────────────────────────────
function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M7.462 0H0v7.19h7.462zM16 0H8.538v7.19H16zM7.462 8.211H0V16h7.462zm8.538 0H8.538V16H16z" />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516s1.52.087 2.475-1.258.762-2.391.728-2.43m3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422s1.675-2.789 1.698-2.854-.597-.79-1.254-1.157a3.7 3.7 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56s.625 1.924 1.273 2.796c.576.984 1.34 1.667 1.659 1.899s1.219.386 1.843.067c.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758q.52-1.185.473-1.282" />
    </svg>
  );
}

function LinuxIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.664-.287 2.45a.424.424 0 0 0-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.267-.864.68-.09.189-.136.4-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.26 2.26-.334.699-.058 1.574.267 2.577.2.025.134.06.267.145.4.515.94 1.48 1.347 2.51 1.066 1.04-.278 1.91-1.066 2.415-2.133.099-.278.187-.564.245-.834.066-.334.106-.667.146-.934.04-.267.087-.5.187-.667.298-.534.834-1.067 1.313-1.6.466-.534.893-1.067.893-1.667 0-.334-.133-.667-.4-.934-.267-.267-.667-.4-1.134-.4-.066 0-.133 0-.2.027-.267.04-.534.134-.8.267-.267.134-.534.267-.8.267-.066 0-.133 0-.2-.027-.267-.04-.534-.134-.8-.267-.267-.134-.534-.267-.8-.267-.066 0-.133 0-.2-.027-.267-.04-.534-.134-.8-.267-.267-.134-.534-.267-.8-.267-.066 0-.133 0-.2-.027-.267-.04-.534-.134-.8-.267-.267-.134-.534-.267-.8-.267-.066 0-.133 0-.2-.027-.267-.04-.534-.134-.8-.267-.267-.134-.534-.267-.8-.267-.066 0-.133 0-.2-.027-.267-.04-.534-.134-.8-.267-.267-.134-.534-.267-.8-.267z" />
    </svg>
  );
}

const platformIconComponent: Record<Platform, React.ComponentType<{ className?: string }>> = {
  WINDOWS: WindowsIcon,
  MACOS: AppleIcon,
  LINUX: LinuxIcon,
};

// ─── Animation variants ────────────────────────────────────
const containerStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const itemSlideUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

// ─── Floating particles background ─────────────────────────
function FloatingParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 15 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 3 + Math.random() * 7,
        duration: 10 + Math.random() * 15,
        delay: Math.random() * 5,
      })),
    [],
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-gold-500/15"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -40, 0],
            opacity: [0, 0.5, 0],
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
    <div className="relative inline-flex items-center gap-1.5 p-1.5 rounded-full bg-navy-950/60 border border-gold-500/10 backdrop-blur-md">
      {platforms.map((p) => (
        <button
          key={p}
          onClick={() => onSelect(p)}
          className={`relative px-5 py-2.5 text-xs font-semibold rounded-full transition-all z-10 duration-300 ${
            selected === p
              ? "text-navy-950 shadow-md shadow-gold-500/20"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {selected === p && (
            <motion.div
              layoutId="platform-pill"
              className="absolute inset-0 rounded-full bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600"
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            {(() => {
              const Icon = platformIconComponent[p];
              return <Icon className="h-4 w-4" />;
            })()}
            <T>{platformLabel[p]}</T>
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Interactive 3D Mockup App Window ──────────────────────
function DesktopAppMockup() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Rotating mapping values
  const rotateX = useTransform(y, [-200, 200], [8, -8]);
  const rotateY = useTransform(x, [-200, 200], [-8, 8]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;
    x.set(mouseX);
    y.set(mouseY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  // State for ticking live rate simulation
  const [goldRate, setGoldRate] = useState(7852);
  useEffect(() => {
    const interval = setInterval(() => {
      setGoldRate((prev) => prev + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="perspective-1000 w-full flex justify-center">
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full max-w-xl aspect-[16/10.5] rounded-xl border border-gold-500/20 bg-navy-950/80 backdrop-blur-xl shadow-2xl shadow-gold-500/10 overflow-hidden transition-all duration-300 ease-out select-none group"
      >
        {/* Shine glare overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none z-20 transition-opacity duration-300 group-hover:opacity-60" />

        {/* Windows / macOS bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0b1420]/90 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          </div>
          <div className="text-[10px] font-semibold text-slate-400 font-mono flex items-center gap-1.5">
            <ComputerDesktopIcon className="w-3.5 h-3.5 text-gold-500" />
            <T>Orivraa Shop Counter — Live</T>
          </div>
          <div className="w-8" />
        </div>

        <div className="flex h-[calc(100%-37px)]">
          {/* Sidebar */}
          <div className="w-[30%] bg-[#070e15]/90 border-r border-white/10 p-2.5 flex flex-col gap-3 text-left">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-gold-500/10 border border-gold-500/25">
              <div className="w-5.5 h-5.5 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center font-bold text-[10px] text-navy-950 shrink-0 shadow-sm shadow-gold-500/30">
                O
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-slate-100 truncate"><T>Orivraa Jewelers</T></p>
                <p className="text-[7px] text-slate-400 truncate"><T>Main Counter</T></p>
              </div>
            </div>

            <div className="space-y-1">
              {[
                { label: "POS Billing", active: true, icon: BoltIcon },
                { label: "Inventory", active: false, icon: CircleStackIcon },
                { label: "Live Rates", active: false, icon: SparklesIcon },
                { label: "Invoices", active: false, icon: CommandLineIcon },
                { label: "Settings", active: false, icon: ArrowPathIcon },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[9px] font-semibold transition-colors ${
                    item.active
                      ? "bg-gold-500 text-navy-950 shadow-sm shadow-gold-500/20"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                  }`}
                >
                  <item.icon className="w-3 h-3 shrink-0" />
                  <T>{item.label}</T>
                </div>
              ))}
            </div>

            <div className="mt-auto p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-center">
              <p className="text-[8px] font-bold text-emerald-400"><T>Cloud Auto-Synced</T></p>
              <p className="text-[7px] text-slate-400"><T>Offline ready</T></p>
            </div>
          </div>

          {/* Main POS area */}
          <div className="flex-1 bg-[#0b1420]/35 p-3 flex flex-col gap-2.5 text-left overflow-hidden">
            {/* Headers row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-1.5 rounded-lg bg-[#070e15]/70 border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[6.5px] text-slate-400 uppercase font-semibold"><T>Gold 24K Rate</T></p>
                  <p className="text-[10px] font-bold text-gold-400 font-mono">₹{goldRate}/g</p>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              </div>

              <div className="p-1.5 rounded-lg bg-[#070e15]/70 border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[6.5px] text-slate-400 uppercase font-semibold"><T>Weighing Scale</T></p>
                  <p className="text-[10px] font-bold text-slate-100 font-mono">11.6638 g</p>
                </div>
                <span className="text-[7px] font-bold text-emerald-400 font-mono uppercase bg-emerald-500/10 px-1 rounded shrink-0">COM3</span>
              </div>
            </div>

            {/* Bill Sheet */}
            <div className="flex-1 bg-[#070e15]/50 rounded-lg border border-white/10 p-2 flex flex-col gap-1.5 justify-between overflow-hidden">
              <div className="space-y-1">
                <div className="flex justify-between items-center pb-1 border-b border-white/10">
                  <span className="text-[8px] font-bold text-slate-200"><T>Active Receipt</T></span>
                  <span className="text-[6.5px] text-slate-400 font-mono">#GSHOP-9281</span>
                </div>

                <div className="space-y-1 max-h-[75px] overflow-y-auto">
                  {[
                    { name: "22K Gold Bridal Chain (Necklace)", desc: "Weight: 24.50g · Making: 8%", price: "₹181,300" },
                    { name: "18K Gold Diamond Stud Ring", desc: "Weight: 4.20g · Gemstone: 0.5ct", price: "₹84,500" },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between text-[8px] border-b border-white/5 pb-1">
                      <div className="truncate pr-1">
                        <p className="font-semibold text-slate-200 truncate"><T>{item.name}</T></p>
                        <p className="text-[6.5px] text-slate-400 truncate"><T>{item.desc}</T></p>
                      </div>
                      <span className="font-bold text-slate-100 shrink-0">{item.price}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-0.5 border-t border-dashed border-white/10 pt-1.5">
                <div className="flex justify-between text-[7px] text-slate-400">
                  <span><T>Subtotal</T></span>
                  <span className="font-mono">₹265,800</span>
                </div>
                <div className="flex justify-between text-[7px] text-slate-400">
                  <span><T>GST/Tax (3% + 5%)</T></span>
                  <span className="font-mono">₹8,124</span>
                </div>
                <div className="flex justify-between text-[8.5px] font-bold text-gold-400 pt-0.5 border-t border-white/10">
                  <span><T>Total Net Amount</T></span>
                  <span className="font-mono">₹273,924</span>
                </div>
              </div>
            </div>

            {/* Simulated Action */}
            <div className="flex justify-end gap-1.5 shrink-0">
              <div className="px-2 py-1 rounded bg-gradient-to-r from-gold-400 to-gold-600 text-navy-950 text-[7.5px] font-bold shadow-md shadow-gold-500/25 flex items-center gap-1">
                <CheckIcon className="w-2.5 h-2.5 stroke-[3]" />
                <T>Complete & Print Invoice (Ctrl+Enter)</T>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Bento Grid Interactive Panels ──────────────────────
function BentoSyncShowcase() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setOffline((prev) => !prev);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-full flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-border/20">
        <span className="text-xs font-semibold text-gold-400 flex items-center gap-1.5">
          <CloudArrowUpIcon className="w-4 h-4 text-gold-500" />
          <T>Live Connection Status</T>
        </span>
        <span
          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 transition-all ${
            offline
              ? "bg-red-500/10 text-red-500 border border-red-500/25"
              : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/25"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${offline ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
          {offline ? <T>Offline Mode</T> : <T>Online Mode</T>}
        </span>
      </div>

      <div className="relative py-6 flex justify-around items-center h-28 bg-muted/40 dark:bg-navy-950/45 rounded-xl border border-border/20 my-4 overflow-hidden">
        {/* Connection flow lines */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-[60%] h-0.5 border-t-2 border-dashed ${offline ? "border-red-500/20" : "border-gold-500/40"} relative`}>
            {!offline && (
              <motion.div
                className="absolute w-2 h-2 rounded-full bg-gold-400 top-[-5px]"
                animate={{ left: ["0%", "100%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            )}
          </div>
        </div>

        <div className="z-10 flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-lg bg-background border border-border/30 flex items-center justify-center shadow-lg">
            <ComputerDesktopIcon className="w-5 h-5 text-foreground" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground"><T>Local POS App</T></span>
        </div>

        <div className="z-10 flex flex-col items-center gap-1">
          <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shadow-lg transition-colors bg-background border-border dark:bg-gold-500/10 dark:border-gold-500/30`}>
            <ServerIcon className={`w-5 h-5 ${offline ? "text-muted-foreground" : "text-gold-500"}`} />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground"><T>Orivraa Cloud</T></span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed mt-2">
        <T>
          Bill at the counter even if your internet goes down completely. Draft invoices are cached securely in a local database and automatically sync to the server the second connection is restored.
        </T>
      </p>
    </div>
  );
}

function BentoScaleShowcase() {
  const [weight, setWeight] = useState(0);

  useEffect(() => {
    let frame = 0;
    const interval = setInterval(() => {
      frame += 1;
      if (frame % 2 === 0) {
        // Ticking up
        setWeight(11.6638);
      } else {
        // Clear
        setWeight(0.0);
      }
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col justify-between">
      <div className="flex items-center gap-1.5 pb-2">
        <CircleStackIcon className="w-4 h-4 text-gold-500" />
        <span className="text-xs font-semibold text-gold-400"><T>USB weighing scale sync</T></span>
      </div>

      <div className="my-3 p-4 rounded-xl bg-black border border-gold-500/25 flex flex-col items-center gap-1.5 font-mono shadow-inner shadow-gold-500/5">
        <p className="text-[10px] text-slate-400/60 tracking-wider uppercase font-semibold"><T>Hardware Weight Readout</T></p>
        <div className="flex items-baseline gap-1 text-2xl font-bold tracking-tight text-emerald-400">
          <span>{weight === 0 ? "0.0000" : "11.6638"}</span>
          <span className="text-xs text-emerald-500 font-sans">g</span>
        </div>
        <div className="flex gap-4 text-[9px] text-slate-400">
          <span><T>COM3 Port</T></span>
          <span className="text-emerald-400">● <T>Connected</T></span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        <T>
          Connect weight machines directly. Instant grams or tolas weight locks automatically on the billing sheet, preventing human errors.
        </T>
      </p>
    </div>
  );
}

function BentoTaxShowcase() {
  const [regime, setRegime] = useState<"NP" | "IN" | "AE">("IN");

  return (
    <div className="h-full flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-border/20">
        <span className="text-xs font-semibold text-gold-400 flex items-center gap-1.5">
          <CommandLineIcon className="w-4 h-4 text-gold-500" />
          <T>Interactive Tax Regime Switcher</T>
        </span>
        <div className="flex gap-1 bg-muted dark:bg-navy-950 p-1 rounded-md border border-border/20">
          {(["NP", "IN", "AE"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRegime(r)}
              className={`text-[8.5px] px-2 py-1 rounded font-bold transition-all ${
                regime === r
                  ? "bg-gold-500 text-navy-950 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="my-3 p-3.5 rounded-xl bg-muted/40 dark:bg-navy-950/70 border border-border/30 text-left font-mono space-y-1.5">
        <div className="flex justify-between text-[9px] text-muted-foreground border-b border-border/10 pb-1">
          <span><T>Metal + Making Value</T></span>
          <span>₹110,000</span>
        </div>
        {regime === "IN" && (
          <>
            <div className="flex justify-between text-[9px] text-foreground">
              <span><T>GST on Gold Metal (3%)</T></span>
              <span className="text-gold-400">₹3,000</span>
            </div>
            <div className="flex justify-between text-[9px] text-foreground">
              <span><T>GST on Making Charges (5%)</T></span>
              <span className="text-gold-400">₹500</span>
            </div>
          </>
        )}
        {regime === "NP" && (
          <>
            <div className="flex justify-between text-[9px] text-foreground">
              <span><T>Skill Promotion Fee (0.5%)</T></span>
              <span className="text-gold-400">₹550</span>
            </div>
            <div className="flex justify-between text-[9px] text-foreground">
              <span><T>VAT on Gems Content (13%)</T></span>
              <span className="text-gold-400">₹0</span>
            </div>
          </>
        )}
        {regime === "AE" && (
          <div className="flex justify-between text-[9px] text-foreground">
            <span><T>Dubai standard VAT (5%)</T></span>
            <span className="text-gold-400">₹5,500</span>
          </div>
        )}
        <div className="flex justify-between text-[10px] font-bold text-gold-600 dark:text-gold-400 border-t border-dashed border-border/30 pt-1.5">
          <span><T>Calculated Tax Amount</T></span>
          <span>
            {regime === "IN" && "₹3,500"}
            {regime === "NP" && "₹550"}
            {regime === "AE" && "₹5,500"}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        <T>
          Orivraa automatically adapts invoice calculations to regional tax regimes: India GST, Nepal Skill Promotion Fee, Dubai standard VAT and UK/EU rules out-of-the-box.
        </T>
      </p>
    </div>
  );
}

// ─── Step-by-Step Installation Guides ──────────────────────
function InstallationGuide() {
  const [guideTab, setGuideTab] = useState<"WINDOWS" | "MACOS">("WINDOWS");

  return (
    <Card className="border-border/40 dark:border-gold-500/20 shadow-xl shadow-gold-500/5 bg-card dark:bg-gradient-to-b dark:from-navy-950 dark:to-navy-900 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl" />
      
      <CardHeader className="border-b border-border/20 flex flex-col sm:flex-row items-center justify-between gap-4 py-6 px-6">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <WrenchScrewdriverIcon className="w-5 h-5 text-gold-500" />
            <T>Step-by-Step Setup Guide</T>
          </CardTitle>
          <CardDescription className="text-xs">
            <T>Quick setup instructions to get up and running in minutes.</T>
          </CardDescription>
        </div>

        <div className="flex gap-1.5 bg-muted dark:bg-navy-900 p-1.5 rounded-full border border-border/30 shrink-0">
          {(["WINDOWS", "MACOS"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setGuideTab(t)}
              className={`text-xs px-4 py-1.5 rounded-full font-bold transition-all ${
                guideTab === t
                  ? "bg-gold-500 text-navy-950 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <T>{platformLabel[t]}</T>
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="py-8 px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Instructions Column */}
          <div className="space-y-6 text-left">
            {guideTab === "WINDOWS" ? (
              <>
                <div className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-500 flex items-center justify-center font-bold text-sm shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground mb-1"><T>Download the installer</T></h4>
                    <p className="text-xs text-muted-foreground"><T>Click the "Download for Windows" button above to download the Windows installer file.</T></p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-500 flex items-center justify-center font-bold text-sm shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground mb-1"><T>Bypass SmartScreen</T></h4>
                    <p className="text-xs text-muted-foreground">
                      <T>
                        Since the app is newly published, Windows Defender might prompt with "Windows protected your PC". Click on **More Info**, and then click **Run Anyway** to launch the installer safely.
                      </T>
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-500 flex items-center justify-center font-bold text-sm shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground mb-1"><T>Run & Autoupdate</T></h4>
                    <p className="text-xs text-muted-foreground"><T>Orivraa will configure, launch and place a shortcut on your desktop automatically. Updates will download silently in the background.</T></p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-500 flex items-center justify-center font-bold text-sm shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground mb-1"><T>Download and open .dmg</T></h4>
                    <p className="text-xs text-muted-foreground"><T>Click the "Download for macOS" button to save the dmg file, then double-click to mount the disk image.</T></p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-500 flex items-center justify-center font-bold text-sm shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground mb-1"><T>Drag to Applications</T></h4>
                    <p className="text-xs text-muted-foreground"><T>Drag the Orivraa icon directly into your Applications folder as prompted inside the window.</T></p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-500 flex items-center justify-center font-bold text-sm shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground mb-1"><T>Authorize Gatekeeper alert</T></h4>
                    <p className="text-xs text-muted-foreground">
                      <T>
                        If macOS blocks launch with an "unidentified developer" dialog: Right-click (Control-click) Orivraa in your Applications folder and select **Open** from the context menu, then click **Open** on the prompt.
                      </T>
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Visual Instruction Column */}
          <div className="rounded-xl border border-border/40 bg-muted/30 dark:bg-navy-950/60 p-5 flex flex-col justify-center items-center gap-4 text-center">
            {guideTab === "WINDOWS" ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-gold-500/10 flex items-center justify-center border border-gold-500/20 shadow-md">
                  <ShieldExclamationIcon className="w-8 h-8 text-gold-400" />
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <p className="font-bold text-sm text-foreground"><T>SmartScreen Warning Help</T></p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <T>
                      Microsoft Defender flags new apps until they gain web reputation. Click "More Info" followed by "Run anyway". The app runs fully offline and is completely clean.
                    </T>
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-gold-500/10 flex items-center justify-center border border-gold-500/20 shadow-md">
                  <LockClosedIcon className="w-8 h-8 text-gold-400" />
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <p className="font-bold text-sm text-foreground"><T>Gatekeeper Block Help</T></p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <T>
                      Instead of double-clicking the app, Right-Click (or Control-Click) Orivraa inside Applications and choose "Open". This authorizes the app for local execution.
                    </T>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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
          <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
            {(() => {
              const Icon = platformIconComponent[release.platform as Platform] || LinuxIcon;
              return <Icon className="h-5 w-5" />;
            })()}
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
          <Button variant="outline" size="sm" asChild className="group-hover:border-gold-500/30 font-semibold">
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
  const [downloading, setDownloading] = useState(false);

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

  const downloadUrl = useMemo(() => {
    return primaryRelease ? resolveDownloadUrl(primaryRelease) : null;
  }, [primaryRelease]);

  const handleDownload = async () => {
    if (!primaryRelease || !downloadUrl) return;
    setDownloading(true);
    await trackDownloadClick(primaryRelease.id);
    const url = new URL(downloadUrl);
    if (url.hostname === 'releases.orivraa.com' || url.hostname.endsWith('.github.com') || url.hostname === 'github.com') {
      window.location.href = downloadUrl;
    } else {
      console.error('Invalid download URL:', downloadUrl);
    }
    setTimeout(() => setDownloading(false), 3000);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 text-foreground overflow-x-hidden">
        
        {/* ═══ Hero Section (Split Layout) ═══ */}
        <section ref={heroRef} className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28 border-b border-border/20">
          
          {/* Glowing gradients */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <motion.div
              className="absolute top-1/4 left-1/12 w-[600px] h-[600px] bg-gold-500/5 rounded-full blur-[140px]"
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.3, 0.45, 0.3],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-1/4 right-1/10 w-[500px] h-[500px] bg-gold-700/5 rounded-full blur-[140px]"
              animate={{
                scale: [1.15, 1, 1.15],
                opacity: [0.25, 0.4, 0.25],
              }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          <FloatingParticles />

          <motion.div
            style={{ y: heroY, opacity: heroOpacity }}
            className="container mx-auto px-4 relative z-10"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Left Column: CTA & Headline */}
              <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left">
                {/* Active Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-500/10 text-gold-600 dark:text-gold-400 text-xs font-semibold mb-6 border border-gold-500/25 shadow-sm"
                >
                  <ComputerDesktopIcon className="w-4 h-4 animate-pulse" />
                  <T>Desktop POS for jewellery shops</T>
                  <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-ping" />
                </motion.div>

                {/* Headline */}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight max-w-xl">
                  <T>Supercharge your</T>
                  <br />
                  <span className="bg-gradient-to-r from-gold-500 via-gold-600 to-gold-700 dark:from-gold-300 dark:via-gold-400 dark:to-gold-600 bg-clip-text text-transparent">
                    <T>shop counter POS</T>
                  </span>
                </h1>

                {/* Subtitle */}
                <p className="text-base text-muted-foreground max-w-lg mb-6 leading-relaxed">
                  <T>
                    Bill clients instantly even when your network goes dark. Orivraa Desktop introduces lightning-fast USB weight scale syncing, native barcode parsing, and silent cloud updates directly at the shop counter.
                  </T>
                </p>

                {/* Detected System Indicator */}
                <p className="text-xs font-mono text-muted-foreground mb-4">
                  {detectedPlatform === "WINDOWS" && <T>We detected your system runs Windows</T>}
                  {detectedPlatform === "MACOS" && <T>We detected your system runs macOS</T>}
                  {detectedPlatform === "LINUX" && <T>We detected your system runs Linux</T>}
                </p>

                {/* Platform selector */}
                <div className="mb-6">
                  <PlatformSelector selected={selectedPlatform} onSelect={setSelectedPlatform} />
                </div>

                {/* Primary Download Button & Warning Alert */}
                <div className="w-full max-w-md space-y-4">
                  {loading ? (
                    <div className="h-16 w-full rounded-2xl bg-navy-950/60 border border-border/20 flex items-center justify-center gap-3">
                      <div className="w-5 h-5 rounded-full border-2 border-transparent border-t-gold-500 border-r-gold-300 animate-spin" />
                      <span className="text-xs text-muted-foreground"><T>Retrieving active build installer...</T></span>
                    </div>
                  ) : downloadUrl ? (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        size="lg"
                        onClick={handleDownload}
                        disabled={downloading}
                        className="w-full bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 hover:from-gold-500 hover:to-gold-700 text-navy-950 font-bold py-7 text-base rounded-2xl gap-3 shadow-xl shadow-gold-500/20 border border-gold-300/30 transition-all border-none"
                      >
                        {downloading ? (
                          <ArrowPathIcon className="w-5 h-5 animate-spin" />
                        ) : (
                          <ArrowDownTrayIcon className="w-5 h-5" />
                        )}
                        <span>
                          <T>Download for</T> {platformLabel[selectedPlatform]} (v{primaryRelease?.version})
                        </span>
                      </Button>
                    </motion.div>
                  ) : (
                    <div className="w-full p-4 rounded-xl bg-muted/60 border border-border/20 text-center space-y-2">
                      <Button size="lg" disabled className="w-full gap-2 opacity-50">
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        <T>Coming Soon</T>
                      </Button>
                      <p className="text-[10px] text-muted-foreground">
                        <T>We are actively building the application for this platform. Please check back shortly!</T>
                      </p>
                    </div>
                  )}

                  {/* Release stats details */}
                  {primaryRelease && !loading && (
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground/80 px-2 font-mono">
                      <span>{primaryRelease.fileName}</span>
                      {primaryRelease.fileSize && (
                        <span><T>Size:</T> {formatBytes(primaryRelease.fileSize)}</span>
                      )}
                    </div>
                  )}

                  {/* Unsigned Alert Notice (Green-tinted, Reassuring) */}
                  <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 text-emerald-800 dark:text-emerald-400 text-xs leading-relaxed text-left flex items-start gap-3 shadow-sm dark:shadow-inner dark:shadow-emerald-950/20">
                    <ShieldExclamationIcon className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                    <div>
                      <p className="font-bold mb-1 text-emerald-900 dark:text-emerald-300">
                        <T>Notice: Windows & macOS verification warnings</T>
                      </p>
                      <p>
                        <T>
                          Because this app is brand new, your operating system might display an alert warning that it is "unrecognized" or "unsafe" during installation. Rest assured, Orivraa is 100% secure, clean, and free of any malware. We are currently processing our official digital certificates with Microsoft and Apple to eliminate these alerts permanently.
                        </T>
                      </p>
                    </div>
                  </div>

                  {/* GitHub mirror */}
                  {primaryRelease && (
                    <div className="flex justify-center pt-2">
                      <a
                        href={`https://github.com/${GITHUB_REPO}/releases/tag/desktop-v${primaryRelease.version}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-gold-600 dark:hover:text-gold-400 transition-colors underline underline-offset-4 flex items-center gap-1.5 font-semibold"
                      >
                        <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                        <T>Download Mirror from GitHub Releases</T>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Interactive App Preview Mockup */}
              <div className="lg:col-span-6 flex justify-center w-full">
                <DesktopAppMockup />
              </div>
            </div>

            {/* Quick stats row */}
            {!loading && latestReleases.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex justify-center gap-12 mt-16 text-center border-t border-border/10 pt-8"
              >
                {[
                  { label: "Operating Systems", value: "Windows / macOS" },
                  { label: "Hardware Sync", value: "Weighing Scales & Barcodes" },
                  { label: "Offline Mode", value: "Full Cache & Sync Engine" },
                ].map((stat, i) => (
                  <div key={i}>
                    <p className="text-xl font-bold bg-gradient-to-r from-gold-600 to-gold-800 dark:from-gold-300 dark:to-gold-500 bg-clip-text text-transparent">
                      <T>{stat.value}</T>
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
          <section className="py-16 border-b border-border/20 bg-muted/5 dark:bg-navy-950/20">
            <div className="container mx-auto px-4 max-w-3xl">
              <h2 className="text-2xl font-bold text-center mb-10 tracking-tight text-foreground">
                <T>System Requirements</T>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="border border-border/40 hover:border-gold-500/20 transition-all rounded-2xl bg-card text-card-foreground p-6 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gold-500/10 flex items-center justify-center shrink-0">
                    <ServerIcon className="w-6 h-6 text-gold-500 dark:text-gold-400" />
                  </div>
                  <p className="font-bold text-sm text-foreground"><T>Operating System</T></p>
                  <p className="text-xs text-muted-foreground text-center">{primaryRelease.minOs || "Windows 10+ / macOS 12+"}</p>
                </div>

                <div className="border border-border/40 hover:border-gold-500/20 transition-all rounded-2xl bg-card text-card-foreground p-6 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gold-500/10 flex items-center justify-center shrink-0">
                    <CpuChipIcon className="w-6 h-6 text-gold-500 dark:text-gold-400" />
                  </div>
                  <p className="font-bold text-sm text-foreground"><T>Memory</T></p>
                  <p className="text-xs text-muted-foreground text-center">{primaryRelease.minRam || "4 GB RAM"}</p>
                </div>

                <div className="border border-border/40 hover:border-gold-500/20 transition-all rounded-2xl bg-card text-card-foreground p-6 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gold-500/10 flex items-center justify-center shrink-0">
                    <CircleStackIcon className="w-6 h-6 text-gold-500 dark:text-gold-400" />
                  </div>
                  <p className="font-bold text-sm text-foreground"><T>Disk Space</T></p>
                  <p className="text-xs text-muted-foreground text-center">{primaryRelease.minDisk || "200 MB"}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ═══ Bento Grid Features ═══ */}
        <section className="py-24 border-b border-border/20">
          <div className="container mx-auto px-4 max-w-5xl">
            
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4 text-foreground">
                <T>Why Run Orivraa Desktop?</T>
              </h2>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                <T>Native application speeds coupled with specialized shop counter hardware compatibility.</T>
              </p>
            </div>

            <motion.div
              variants={containerStagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {/* Bento Card 1: Offline Sync (Wide) */}
              <motion.div
                variants={itemSlideUp}
                className="md:col-span-2 rounded-2xl border border-border/40 bg-card text-card-foreground p-6 flex flex-col justify-between hover:border-gold-500/30 hover:shadow-lg hover:shadow-gold-500/5 transition-all duration-300 text-left min-h-[250px]"
              >
                <BentoSyncShowcase />
              </motion.div>

              {/* Bento Card 2: Scale sync (Square) */}
              <motion.div
                variants={itemSlideUp}
                className="rounded-2xl border border-border/40 bg-card text-card-foreground p-6 flex flex-col justify-between hover:border-gold-500/30 hover:shadow-lg hover:shadow-gold-500/5 transition-all duration-300 text-left min-h-[250px]"
              >
                <BentoScaleShowcase />
              </motion.div>

              {/* Bento Card 3: Barcode lookup (Square) */}
              <motion.div
                variants={itemSlideUp}
                className="rounded-2xl border border-border/40 bg-card text-card-foreground p-6 flex flex-col justify-between hover:border-gold-500/30 hover:shadow-lg hover:shadow-gold-500/5 transition-all duration-300 text-left min-h-[250px] group"
              >
                <div className="flex items-center gap-1.5 pb-2">
                  <QrCodeIcon className="w-4 h-4 text-gold-500" />
                  <span className="text-xs font-semibold text-gold-600 dark:text-gold-400"><T>Barcode Scanning</T></span>
                </div>
                <div className="relative my-3 p-4 rounded-xl bg-muted/40 dark:bg-navy-950/80 border border-border/30 overflow-hidden flex flex-col justify-center items-center h-28">
                  {/* Sweep scan bar */}
                  <div className="absolute left-0 right-0 h-[2px] bg-red-500/60 top-0 shadow-lg shadow-red-500 group-hover:animate-[bounce_2.5s_infinite_linear]" />
                  <div className="w-16 h-10 border-x border-border/40 relative flex gap-0.5 justify-around items-end px-1 opacity-70">
                    {[16, 28, 20, 32, 12, 24, 28, 16, 8, 30].map((h, i) => (
                      <div key={i} className="w-0.5 bg-foreground" style={{ height: `${h}px` }} />
                    ))}
                  </div>
                  <p className="text-[8px] font-mono text-muted-foreground mt-2"><T>RFID / Code scanner sweep</T></p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <T>
                    Search products instantaneously with handheld scan systems. Speed up customer checkouts and reduce item listing lookups.
                  </T>
                </p>
              </motion.div>

              {/* Bento Card 4: Tax switch (Wide) */}
              <motion.div
                variants={itemSlideUp}
                className="md:col-span-2 rounded-2xl border border-border/40 bg-card text-card-foreground p-6 flex flex-col justify-between hover:border-gold-500/30 hover:shadow-lg hover:shadow-gold-500/5 transition-all duration-300 text-left min-h-[250px]"
              >
                <BentoTaxShowcase />
              </motion.div>
            </motion.div>

          </div>
        </section>

        {/* ═══ Auto-update Highlight ═══ */}
        <section className="py-20 border-b border-border/20">
          <div className="container mx-auto px-4 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="border-border/40 dark:border-gold-500/20 bg-gradient-to-br from-gold-500/5 dark:from-gold-950/10 to-transparent overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl" />
                <CardContent className="py-8 px-6 md:px-8 relative z-10">
                  <div className="flex flex-col sm:flex-row items-start gap-5">
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/20">
                      <ArrowPathIcon className="w-6 h-6 text-navy-950 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground mb-2 flex items-center gap-2 flex-wrap">
                        <T>Silent Background Autoupdates</T>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 font-semibold font-mono">
                          v0.2.0+
                        </span>
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                        <T>
                          Orivraa Desktop queries for available updates on launch. When updates are published, they download in the background over Cloudflare R2 or GitHub. Once ready, you'll receive a popup notice. A quick restart is all that is required to run the new version.
                        </T>
                      </p>
                      <div className="flex flex-wrap gap-2.5">
                        {[
                          "Cloudflare R2 CDN",
                          "GitHub fallback mirror",
                          "Signed release verification",
                          "Differential update downloads",
                        ].map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-2.5 py-1 rounded bg-muted dark:bg-navy-950 text-muted-foreground dark:text-slate-300 border border-border/40 font-medium"
                          >
                            <T>{tag}</T>
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

        {/* ═══ Setup Guides ═══ */}
        <section className="py-20 border-b border-border/20">
          <div className="container mx-auto px-4 max-w-4xl">
            <InstallationGuide />
          </div>
        </section>

        {/* ═══ Blog Highlights ═══ */}
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

        {/* ═══ Previous Versions ═══ */}
        {platformOlder.length > 0 && (
          <section className="py-16 border-b border-border/20 bg-muted/10 dark:bg-navy-950/15">
            <div className="container mx-auto px-4 max-w-2xl">
              <div className="mb-8 text-left">
                <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <CommandLineIcon className="w-5 h-5 text-gold-500" />
                  <T>Previous Versions</T>
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  <T>Older desktop versions are fetched and served directly from GitHub Releases.</T>
                </p>
              </div>
              <div className="space-y-3.5">
                {platformOlder.map((release, i) => (
                  <OlderVersionRow key={release.id} release={release} index={i} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══ Changelog Callout ═══ */}
        <section className="py-20 bg-muted/20 dark:bg-navy-950/30">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="container mx-auto px-4 text-center max-w-md"
          >
            <h2 className="text-xl font-bold mb-2 text-foreground">
              <T>Release Changelog</T>
            </h2>
            <p className="text-xs text-muted-foreground mb-6">
              <T>
                Review features, hotfixes and design logs across both web and desktop branches.
              </T>
            </p>
            <Button variant="outline" asChild className="gap-2 border-border/40 hover:bg-muted text-foreground font-semibold">
              <Link href="/download/changelog">
                <CommandLineIcon className="w-4.5 h-4.5 text-gold-500 dark:text-gold-400" />
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
