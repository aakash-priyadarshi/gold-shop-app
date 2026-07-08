"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { T } from "@/components/ui/T";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { api } from "@/lib/api";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  BoltIcon,
  CpuChipIcon,
  ComputerDesktopIcon,
  CloudArrowUpIcon,
  ArrowTopRightOnSquareIcon,
  CircleStackIcon,
  ServerIcon,
  CommandLineIcon,
  ShieldExclamationIcon,
  CheckIcon,
  QrCodeIcon,
  WrenchScrewdriverIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue } from "framer-motion";
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
      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.664-.287 2.45a.424.424 0 0 0-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.267-.864.68-.09.189-.136.4-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.26 2.26-.334.699-.058 1.574.267 2.577.2.025.134.06.267.145.4.515.94 1.48 1.347 2.51 1.066 1.04-.278 1.91-1.066 2.415-2.133.099-.278.187-.564.245-.834.066-.334.106-.667.146-.934.04-.267.087-.5.187-.667.298-.534.834-1.067 1.313-1.6.466-.534.893-1.067.893-1.667 0-.334-.133-.667-.4-.934-.267-.267-.667-.4-1.134-.4-.066 0-.133 0-.2.027-.267.04-.534.134-.8.267-.267.134-.534.267-.8.267-.066 0-.133 0-.2-.027-.267-.04-.534-.134-.8-.267-.267-.134-.534-.267-.8-.267-.066 0-.133 0-.2-.027-.267-.04-.534-.134-.8-.267-.267-.134-.534-.267-.8-.267z" />
    </svg>
  );
}

const platformIconComponent: Record<Platform, React.ComponentType<{ className?: string }>> = {
  WINDOWS: WindowsIcon,
  MACOS: AppleIcon,
  LINUX: LinuxIcon,
};

// ─── R2 latest.json fallback ──────────────────────────────
// If the API is missing a platform (e.g. publish failed), fall back to
// R2's latest.json which is always written by the CI pipeline.
interface R2LatestJson {
  version: string;
  platforms: {
    "windows-x86_64"?: { url: string };
    "darwin-aarch64"?: { url: string };
    "darwin-x86_64"?: { url: string };
  };
}

async function fetchR2Fallback(platform: Platform): Promise<Release | null> {
  try {
    const res = await fetch("https://releases.orivraa.com/desktop/latest.json");
    if (!res.ok) return null;
    const data: R2LatestJson = await res.json();
    const key =
      platform === "WINDOWS"
        ? "windows-x86_64"
        : "darwin-aarch64";
    const entry = data.platforms[key];
    if (!entry) return null;
    const fileName = entry.url.split("/").pop() || null;
    return {
      id: `r2-fallback-${platform}`,
      version: data.version,
      platform,
      channel: "stable",
      downloadUrl: entry.url,
      fileSize: null,
      fileName,
      changelog: null,
      githubChangelog: null,
      isLatest: true,
      minOs: platform === "WINDOWS" ? "Windows 10 (1809+)" : "macOS 12+",
      minRam: "4 GB",
      minDisk: "200 MB",
      architecture: platform === "WINDOWS" ? "x64" : "universal",
      publishedAt: new Date().toISOString(),
      downloadCount: 0,
    };
  } catch {
    return null;
  }
}

// ─── Download Confirm Dialog (SmartScreen / Gatekeeper) ───
function DownloadConfirmDialog({
  open,
  onOpenChange,
  platform,
  release,
  onConfirm,
  downloading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: Platform;
  release: Release | null;
  onConfirm: () => void;
  downloading: boolean;
}) {
  const isWindows = platform === "WINDOWS";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <DialogHeader className="sr-only">
          <DialogTitle>
            <T>Download confirmation</T>
          </DialogTitle>
          <DialogDescription>
            <T>Review the installation warning before downloading.</T>
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 text-left">
          {/* Header with icon */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shrink-0">
              {isWindows ? (
                <ShieldExclamationIcon className="w-6 h-6 text-gold-600 dark:text-gold-400" />
              ) : (
                <LockClosedIcon className="w-6 h-6 text-gold-600 dark:text-gold-400" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {isWindows ? <T>Windows SmartScreen Warning</T> : <T>macOS Gatekeeper Warning</T>}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <T>One-time security prompt — completely normal for new apps.</T>
              </p>
            </div>
          </div>

          {/* Platform-specific steps */}
          <div className="space-y-3 mb-6">
            {isWindows ? (
              <>
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-600 dark:text-gold-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    <T>When you run the installer, Windows may show &quot;Windows protected your PC&quot;. Click</T>{" "}
                    <span className="font-semibold text-gray-900 dark:text-white"><T>More Info</T></span>.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-600 dark:text-gold-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    <T>Click</T>{" "}
                    <span className="font-semibold text-gray-900 dark:text-white"><T>Run Anyway</T></span>{" "}
                    <T>to launch the installer safely.</T>
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-600 dark:text-gold-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    <T>If macOS says &quot;Orivraa cannot be opened&quot;:</T>{" "}
                    <span className="font-semibold text-gray-900 dark:text-white"><T>Right-click</T></span>{" "}
                    <T>Orivraa in Applications.</T>
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-600 dark:text-gold-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    <T>Select</T>{" "}
                    <span className="font-semibold text-gray-900 dark:text-white"><T>Open</T></span>{" "}
                    <T>from the context menu, then click</T>{" "}
                    <span className="font-semibold text-gray-900 dark:text-white"><T>Open</T></span>{" "}
                    <T>on the prompt.</T>
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Reassurance */}
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 mb-6">
            <p className="text-xs text-emerald-800 dark:text-emerald-400 leading-relaxed">
              <T>Orivraa is 100% secure and free of malware. We are processing official digital certificates with Microsoft and Apple to eliminate these alerts permanently.</T>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold"
            >
              <T>Cancel</T>
            </Button>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
              <Button
                onClick={onConfirm}
                disabled={downloading || !release}
                className="w-full bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 hover:from-gold-500 hover:to-gold-700 text-gray-950 font-bold gap-2 shadow-lg shadow-gold-500/20"
              >
                {downloading ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowDownTrayIcon className="w-4 h-4" />
                )}
                <T>Continue Download</T>
              </Button>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Download Card (per platform) ─────────────────────────
function DownloadCard({
  platform,
  release,
  loading,
  isPrimary,
  onDownload,
  downloading,
}: {
  platform: Platform;
  release: Release | null;
  loading: boolean;
  isPrimary: boolean;
  onDownload: () => void;
  downloading: boolean;
}) {
  const Icon = platformIconComponent[platform];
  const downloadUrl = release ? resolveDownloadUrl(release) : null;
  const githubMirrorUrl = release
    ? `https://github.com/${GITHUB_REPO}/releases/tag/desktop-v${release.version}`
    : null;

  return (
    <div
      className={`relative rounded-2xl border p-6 flex flex-col gap-4 transition-all duration-300 ${
        isPrimary
          ? "border-gold-500/40 bg-gradient-to-br from-gold-50 to-transparent dark:from-gold-950/20 dark:to-transparent shadow-lg shadow-gold-500/10"
          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gold-500/20"
      }`}
    >
      {isPrimary && (
        <span className="absolute -top-2.5 left-6 px-3 py-0.5 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 text-gray-950 text-[10px] font-bold shadow-md">
          <T>Detected OS</T>
        </span>
      )}

      {/* Platform header */}
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isPrimary ? "bg-gold-500/15" : "bg-gray-100 dark:bg-gray-800"}`}>
          <Icon className={`h-6 w-6 ${isPrimary ? "text-gold-600 dark:text-gold-400" : "text-gray-600 dark:text-gray-300"}`} />
        </div>
        <div>
          <h3 className="font-bold text-base text-gray-900 dark:text-white">
            {platformLabel[platform]}
          </h3>
          {release ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              v{release.version} · {release.architecture || "—"}
            </p>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {loading ? <T>Loading...</T> : <T>Not available</T>}
            </p>
          )}
        </div>
      </div>

      {/* Download button */}
      {loading ? (
        <div className="h-12 w-full rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-transparent border-t-gold-500 border-r-gold-300 animate-spin" />
          <span className="text-xs text-gray-500 dark:text-gray-400"><T>Retrieving installer...</T></span>
        </div>
      ) : downloadUrl ? (
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
          <Button
            onClick={onDownload}
            disabled={downloading}
            className={`w-full font-bold py-3.5 text-sm rounded-xl gap-2 transition-all ${
              isPrimary
                ? "bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 hover:from-gold-500 hover:to-gold-700 text-gray-950 shadow-lg shadow-gold-500/20"
                : "bg-gray-900 dark:bg-white text-white dark:text-gray-950 hover:bg-gray-800 dark:hover:bg-gray-100"
            }`}
          >
            {downloading ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowDownTrayIcon className="w-4 h-4" />
            )}
            <T>Download for</T> {platformLabel[platform]}
          </Button>
        </motion.div>
      ) : (
        <Button disabled className="w-full py-3.5 text-sm rounded-xl gap-2 opacity-50">
          <ArrowDownTrayIcon className="w-4 h-4" />
          <T>Coming Soon</T>
        </Button>
      )}

      {/* Metadata chips */}
      {release && !loading && (
        <div className="flex flex-wrap gap-2">
          {release.fileSize && (
            <span className="text-[10px] px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono">
              {formatBytes(release.fileSize)}
            </span>
          )}
          {release.minOs && (
            <span className="text-[10px] px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              {release.minOs}
            </span>
          )}
          <span className="text-[10px] px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {formatDate(release.publishedAt)}
          </span>
        </div>
      )}

      {/* GitHub mirror */}
      {githubMirrorUrl && !loading && (
        <a
          href={githubMirrorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gold-600 dark:hover:text-gold-400 transition-colors flex items-center gap-1.5 font-medium"
        >
          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
          <T>GitHub Releases mirror</T>
        </a>
      )}
    </div>
  );
}

// ─── Simplified 3D App Mockup ─────────────────────────────
function DesktopAppMockup() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-200, 200], [6, -6]);
  const rotateY = useTransform(x, [-200, 200], [-6, 6]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - rect.left - rect.width / 2);
    y.set(e.clientY - rect.top - rect.height / 2);
  };

  return (
    <div className="perspective-1000 w-full flex justify-center">
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { x.set(0); y.set(0); }}
        className="relative w-full max-w-2xl aspect-[16/10] rounded-xl border border-gray-200 dark:border-gray-700 bg-[#0b1420] shadow-2xl shadow-gold-500/10 overflow-hidden transition-all duration-300 ease-out select-none group ring-1 ring-gray-900/5 dark:ring-white/5"
      >
        {/* Shine glare */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none z-20 transition-opacity duration-300 group-hover:opacity-60" />

        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          </div>
          <p className="text-[9px] font-bold text-slate-100"><T>Orivraa Desktop — Main Counter</T></p>
          <div className="w-12" />
        </div>

        {/* Body — simplified: sidebar + main area */}
        <div className="flex h-[calc(100%-2.5rem)]">
          {/* Sidebar */}
          <div className="w-1/5 bg-[#070e15]/60 border-r border-white/10 p-2 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-gold-500/10">
              <div className="w-5 h-5 rounded bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shrink-0">
                <BoltIcon className="w-3 h-3 text-navy-950" />
              </div>
              <p className="text-[8px] font-bold text-slate-100 truncate"><T>POS Billing</T></p>
            </div>
            {[
              { label: "Inventory", icon: CircleStackIcon },
              { label: "Live Rates", icon: ArrowPathIcon },
              { label: "Invoices", icon: CommandLineIcon },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 p-1.5 rounded text-slate-400 hover:bg-white/5 transition-colors">
                <item.icon className="w-3 h-3 shrink-0" />
                <p className="text-[8px] font-semibold truncate"><T>{item.label}</T></p>
              </div>
            ))}
          </div>

          {/* Main area */}
          <div className="flex-1 p-3 flex flex-col gap-2.5">
            {/* Rate cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-[#070e15]/70 border border-white/10">
                <p className="text-[7px] text-slate-400 uppercase font-semibold"><T>Gold 24K Rate</T></p>
                <p className="text-sm font-bold text-gold-400 font-mono">₹7,852/g</p>
              </div>
              <div className="p-2 rounded-lg bg-[#070e15]/70 border border-white/10">
                <p className="text-[7px] text-slate-400 uppercase font-semibold"><T>Weighing Scale</T></p>
                <p className="text-sm font-bold text-slate-100 font-mono">11.6638 g</p>
              </div>
            </div>

            {/* Active receipt */}
            <div className="flex-1 bg-[#070e15]/50 rounded-lg border border-white/10 p-2.5 flex flex-col gap-1.5">
              <div className="flex justify-between items-center pb-1 border-b border-white/10">
                <span className="text-[9px] font-bold text-slate-200"><T>Active Receipt</T></span>
                <span className="text-[7px] text-slate-400 font-mono">#GSHOP-9281</span>
              </div>
              <div className="space-y-1">
                {[
                  { name: "22K Gold Bridal Chain", price: "₹181,300" },
                  { name: "18K Gold Diamond Ring", price: "₹84,500" },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between text-[9px]">
                    <span className="font-semibold text-slate-200 truncate pr-1"><T>{item.name}</T></span>
                    <span className="font-bold text-slate-100 shrink-0">{item.price}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-white/10 pt-1.5 mt-auto">
                <div className="flex justify-between text-[9px] font-bold text-gold-400">
                  <span><T>Total</T></span>
                  <span className="font-mono">₹273,924</span>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="flex justify-end">
              <div className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-gold-400 to-gold-600 text-navy-950 text-[9px] font-bold shadow-md shadow-gold-500/25 flex items-center gap-1">
                <CheckIcon className="w-3 h-3 stroke-[3]" />
                <T>Complete & Print</T>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Compact Feature Strip ────────────────────────────────
function FeatureStrip() {
  const features = [
    { icon: CloudArrowUpIcon, label: "Offline billing with cloud sync" },
    { icon: CircleStackIcon, label: "USB scale & barcode hardware sync" },
    { icon: ArrowPathIcon, label: "Silent background auto-updates" },
    { icon: BoltIcon, label: "Regional tax engine built-in" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {features.map((f, i) => (
        <ScrollReveal key={i} direction="up" delay={i * 0.08} spring once>
          <div className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gold-500/30 hover:bg-gold-500/5 transition-all duration-200 text-center">
            <div className="w-10 h-10 rounded-lg bg-gold-500/10 flex items-center justify-center shrink-0">
              <f.icon className="w-5 h-5 text-gold-600 dark:text-gold-400" />
            </div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-snug">
              <T>{f.label}</T>
            </p>
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
}

// ─── Install Guide (compressed) ───────────────────────────
function InstallGuide() {
  const [tab, setTab] = useState<"WINDOWS" | "MACOS">("WINDOWS");
  const isWin = tab === "WINDOWS";

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center gap-2">
          <WrenchScrewdriverIcon className="w-5 h-5 text-gold-500" />
          <h3 className="font-bold text-sm text-gray-900 dark:text-white"><T>Setup Guide</T></h3>
        </div>
        <div className="flex gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-full">
          {(["WINDOWS", "MACOS"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all ${
                tab === t
                  ? "bg-gold-500 text-gray-950 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <T>{platformLabel[t]}</T>
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {isWin ? (
              <>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-600 dark:text-gold-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-0.5"><T>Download the installer</T></h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400"><T>Click the Windows download button above to get the .exe installer.</T></p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-600 dark:text-gold-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-0.5"><T>Bypass SmartScreen</T></h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400"><T>Click &quot;More Info&quot; then &quot;Run Anyway&quot; when Windows Defender prompts.</T></p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-600 dark:text-gold-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-0.5"><T>Run & Autoupdate</T></h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400"><T>Orivraa launches and places a desktop shortcut. Updates download silently.</T></p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-600 dark:text-gold-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-0.5"><T>Download and open .dmg</T></h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400"><T>Click the macOS download button, then double-click the .dmg to mount it.</T></p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-600 dark:text-gold-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-0.5"><T>Drag to Applications</T></h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400"><T>Drag the Orivraa icon into your Applications folder.</T></p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-600 dark:text-gold-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-0.5"><T>Bypass Gatekeeper</T></h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400"><T>Right-click Orivraa in Applications → Open → Open on the prompt.</T></p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-5 flex flex-col justify-center items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gold-500/10 flex items-center justify-center border border-gold-500/20">
              {isWin ? (
                <ShieldExclamationIcon className="w-7 h-7 text-gold-500 dark:text-gold-400" />
              ) : (
                <LockClosedIcon className="w-7 h-7 text-gold-500 dark:text-gold-400" />
              )}
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                {isWin ? <T>SmartScreen Warning Help</T> : <T>Gatekeeper Block Help</T>}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
                {isWin ? (
                  <T>Microsoft Defender flags new apps until they gain reputation. Click &quot;More Info&quot; → &quot;Run anyway&quot;. The app is completely clean.</T>
                ) : (
                  <T>Right-click (Control-click) Orivraa in Applications and choose &quot;Open&quot; to authorize it for local execution.</T>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Older version row ────────────────────────────────────
function OlderVersionRow({ release, index }: { release: Release; index: number }) {
  const url = resolveDownloadUrl(release);
  return (
    <ScrollReveal direction="left" delay={index * 0.05} spring={false} duration={0.3} once>
      <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gold-500/30 hover:bg-gold-500/5 transition-all duration-200 group">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            {(() => {
              const Icon = platformIconComponent[release.platform as Platform] || LinuxIcon;
              return <Icon className="h-4.5 w-4.5 text-gray-600 dark:text-gray-300" />;
            })()}
          </div>
          <div>
            <p className="font-medium text-sm flex items-center gap-2 text-gray-900 dark:text-white">
              v{release.version}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {platformLabel[release.platform as Platform] || release.platform}
              </span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
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
    </ScrollReveal>
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
  const [dialogPlatform, setDialogPlatform] = useState<Platform>(detectedPlatform);
  const [dialogOpen, setDialogOpen] = useState(false);
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
        let latest: Release[] = latestRes.data;

        // R2 fallback: if API is missing a platform, try R2 latest.json
        const platformsPresent = new Set(latest.map((r: Release) => r.platform));
        const fallbacks: Release[] = [];
        if (!platformsPresent.has("WINDOWS")) {
          const fb = await fetchR2Fallback("WINDOWS");
          if (fb) fallbacks.push(fb);
        }
        if (!platformsPresent.has("MACOS")) {
          const fb = await fetchR2Fallback("MACOS");
          if (fb) fallbacks.push(fb);
        }
        if (fallbacks.length > 0) {
          latest = [...latest, ...fallbacks];
        }

        setLatestReleases(latest);

        const allOlder = [
          ...(windowsRes.data || []),
          ...(macRes.data || []),
        ].filter((r: Release) => !r.isLatest);
        setOlderReleases(allOlder);
      } catch (err) {
        console.error("Failed to fetch releases:", err);
        // Last resort: try R2 fallback for both platforms
        const [winFb, macFb] = await Promise.all([
          fetchR2Fallback("WINDOWS"),
          fetchR2Fallback("MACOS"),
        ]);
        const fallbacks = [winFb, macFb].filter(Boolean) as Release[];
        if (fallbacks.length > 0) setLatestReleases(fallbacks);
      } finally {
        setLoading(false);
      }
    }
    fetchReleases();
  }, []);

  const getRelease = (p: Platform) => latestReleases.find((r) => r.platform === p) || null;
  const windowsRelease = getRelease("WINDOWS");
  const macosRelease = getRelease("MACOS");

  const allOlder = olderReleases
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 6);

  const handleDownloadClick = (platform: Platform) => {
    setDialogPlatform(platform);
    setDialogOpen(true);
  };

  const handleConfirmDownload = async () => {
    const release = getRelease(dialogPlatform);
    if (!release) return;
    const url = resolveDownloadUrl(release);
    if (!url) return;

    setDownloading(true);
    await trackDownloadClick(release.id);
    const parsed = new URL(url);
    if (
      parsed.hostname === "releases.orivraa.com" ||
      parsed.hostname === "github.com" ||
      parsed.hostname.endsWith(".github.com")
    ) {
      window.location.href = url;
    } else {
      console.error("Invalid download URL:", url);
    }
    setTimeout(() => {
      setDownloading(false);
      setDialogOpen(false);
    }, 3000);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-x-hidden">

        {/* ═══ Hero Section ═══ */}
        <section ref={heroRef} className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-24 border-b border-gray-100 dark:border-gray-900 bg-white dark:bg-gray-950">
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute top-20 left-10 w-72 h-72 bg-gold-200 rounded-full blur-3xl opacity-30 dark:bg-gold-500 dark:opacity-[0.07]" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-gold-300 rounded-full blur-3xl opacity-20 dark:bg-gold-600 dark:opacity-[0.05]" />
          </div>

          <motion.div
            style={{ y: heroY, opacity: heroOpacity }}
            className="container mx-auto px-4 relative z-10"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

              {/* Left: headline + download cards */}
              <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
                <ScrollReveal direction="scale" delay={0.05} spring once>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-50 text-gold-800 text-xs font-semibold mb-6 border border-gold-200/50 dark:bg-gold-950/40 dark:text-gold-300 dark:border-gold-800/40">
                    <ComputerDesktopIcon className="w-4 h-4" />
                    <T>Desktop POS for jewellery shops</T>
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-ping" />
                  </div>
                </ScrollReveal>

                <ScrollReveal direction="up" delay={0.12} spring once>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-5 leading-tight max-w-xl text-gray-900 dark:text-white">
                    <T>Supercharge your</T>
                    <br />
                    <span className="bg-gradient-to-r from-gold-500 via-gold-600 to-gold-700 dark:from-gold-300 dark:via-gold-400 dark:to-gold-600 bg-clip-text text-transparent">
                      <T>shop counter POS</T>
                    </span>
                  </h1>
                </ScrollReveal>

                <ScrollReveal direction="up" delay={0.2} spring once>
                  <p className="text-base text-gray-600 dark:text-gray-300 max-w-lg mb-8 leading-relaxed">
                    <T>
                      Bill clients instantly even when your network goes dark. USB weight scale syncing, native barcode parsing, and silent cloud updates — directly at the shop counter.
                    </T>
                  </p>
                </ScrollReveal>

                {/* Two download cards side-by-side */}
                <ScrollReveal direction="up" delay={0.28} spring once>
                  <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DownloadCard
                      platform="WINDOWS"
                      release={windowsRelease}
                      loading={loading}
                      isPrimary={detectedPlatform === "WINDOWS"}
                      onDownload={() => handleDownloadClick("WINDOWS")}
                      downloading={downloading && dialogPlatform === "WINDOWS"}
                    />
                    <DownloadCard
                      platform="MACOS"
                      release={macosRelease}
                      loading={loading}
                      isPrimary={detectedPlatform === "MACOS"}
                      onDownload={() => handleDownloadClick("MACOS")}
                      downloading={downloading && dialogPlatform === "MACOS"}
                    />
                  </div>
                </ScrollReveal>

                {/* One-line hint */}
                <ScrollReveal direction="up" delay={0.34} spring once>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                    <T>Unsigned build — you&apos;ll see a one-time OS security prompt. We&apos;re processing official certificates.</T>
                  </p>
                </ScrollReveal>
              </div>

              {/* Right: 3D mockup */}
              <div className="lg:col-span-5 flex justify-center w-full">
                <ScrollReveal direction="left" delay={0.3} spring once>
                  <DesktopAppMockup />
                </ScrollReveal>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ═══ Feature Strip ═══ */}
        <section className="py-16 border-b border-gray-100 dark:border-gray-900 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-5xl">
            <FeatureStrip />
          </div>
        </section>

        {/* ═══ Install Guide ═══ */}
        <section className="py-16 border-b border-gray-100 dark:border-gray-900 bg-gray-50 dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-3xl">
            <ScrollReveal direction="up" spring once>
              <h2 className="text-2xl font-bold text-center mb-8 tracking-tight text-gray-900 dark:text-white">
                <T>Get Running in 3 Steps</T>
              </h2>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1} spring once>
              <InstallGuide />
            </ScrollReveal>
          </div>
        </section>

        {/* ═══ Releases + Changelog (merged) ═══ */}
        <section className="py-16 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4 max-w-2xl">
            <ScrollReveal direction="up" spring once>
              <div className="mb-6 text-left">
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                  <CommandLineIcon className="w-5 h-5 text-gold-500" />
                  <T>Previous Versions & Changelog</T>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <T>Older versions served from GitHub Releases.</T>
                </p>
              </div>
            </ScrollReveal>

            {allOlder.length > 0 ? (
              <div className="space-y-3 mb-6">
                {allOlder.map((release, i) => (
                  <OlderVersionRow key={release.id} release={release} index={i} />
                ))}
              </div>
            ) : (
              !loading && (
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 text-center">
                  <T>No previous versions yet.</T>
                </p>
              )
            )}

            <div className="flex justify-center">
              <Button variant="outline" asChild className="gap-2 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white font-semibold">
                <Link href="/download/changelog">
                  <CommandLineIcon className="w-4 h-4 text-gold-500 dark:text-gold-400" />
                  <T>View Full Changelog</T>
                </Link>
              </Button>
            </div>
          </div>
        </section>

      </main>
      <DynamicFooter />

      {/* Download confirm dialog */}
      <DownloadConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        platform={dialogPlatform}
        release={getRelease(dialogPlatform)}
        onConfirm={handleConfirmDownload}
        downloading={downloading}
      />
    </>
  );
}
