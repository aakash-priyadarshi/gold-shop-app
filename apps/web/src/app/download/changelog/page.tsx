"use client";

import { DynamicFooter } from "@/components/layout/DynamicFooter";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import {
  ArrowLeftIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

interface ChangelogEntry {
  id: string;
  version: string;
  platform: string;
  changelog: string;
  displayChangelog: string;
  publishedAt: string;
}

const platformConfig: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  WINDOWS: {
    label: "Windows",
    icon: <ComputerDesktopIcon className="w-4 h-4" />,
    color: "text-blue-500",
  },
  MACOS: {
    label: "macOS",
    icon: <ComputerDesktopIcon className="w-4 h-4" />,
    color: "text-gray-600 dark:text-gray-400",
  },
  WEB: {
    label: "Web",
    icon: <GlobeAltIcon className="w-4 h-4" />,
    color: "text-gold-500",
  },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ChangelogPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    async function fetchChangelog() {
      try {
        const res = await api.get("/releases/changelog?limit=30");
        setEntries(res.data);
      } catch (err) {
        console.error("Failed to fetch changelog:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchChangelog();
  }, []);

  const filtered =
    filter === "ALL" ? entries : entries.filter((e) => e.platform === filter);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/20 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Button
              variant="ghost"
              size="sm"
              className="mb-6 gap-1.5 text-muted-foreground"
              asChild
            >
              <Link href="/download">
                <ArrowLeftIcon className="w-4 h-4" />
                Back to Downloads
              </Link>
            </Button>

            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Changelog
            </h1>
            <p className="text-muted-foreground mb-8">
              What&apos;s new across Orivraa — desktop and web releases combined.
            </p>

            {/* Platform Filter */}
            <div className="flex items-center gap-2 mb-8 flex-wrap">
              {[
                { key: "ALL", label: "All Platforms" },
                { key: "WINDOWS", label: "🪟 Windows" },
                { key: "MACOS", label: "🍎 macOS" },
                { key: "WEB", label: "🌐 Web" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                    filter === f.key
                      ? "bg-gold-500/20 text-gold-600 dark:text-gold-400 font-medium"
                      : "text-muted-foreground hover:bg-muted border border-border/50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Entries */}
            {loading ? (
              <div className="flex flex-col items-center py-16 gap-4">
                <div className="w-8 h-8 rounded-full border-3 border-transparent border-t-gold-500 border-r-gold-300 animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Loading changelog...
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="flex flex-col items-center py-12 gap-3">
                  <p className="text-muted-foreground">
                    No changelog entries found.
                  </p>
                  {filter !== "ALL" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilter("ALL")}
                    >
                      Show All
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[18px] top-2 bottom-2 w-px bg-border" />

                <div className="space-y-6">
                  {filtered.map((entry, i) => {
                    const config = platformConfig[entry.platform] || {
                      label: entry.platform,
                      icon: <GlobeAltIcon className="w-4 h-4" />,
                      color: "text-muted-foreground",
                    };

                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="relative flex gap-4"
                      >
                        {/* Timeline dot */}
                        <div
                          className={`relative z-10 w-9 h-9 rounded-full border-2 border-background bg-muted flex items-center justify-center shrink-0 ${config.color}`}
                        >
                          {config.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">
                              v{entry.version}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full bg-muted ${config.color}`}
                            >
                              {config.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(entry.publishedAt)}
                            </span>
                          </div>
                          {(entry.displayChangelog || entry.changelog) && (
                            <div className="mt-2 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                              {entry.displayChangelog || entry.changelog}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>
      <DynamicFooter />
    </>
  );
}
