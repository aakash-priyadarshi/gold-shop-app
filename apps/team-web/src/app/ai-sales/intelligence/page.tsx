"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aiSalesApi } from "@/lib/api";
import {
    ArrowLeft,
    Award,
    Brain,
    Clock,
    Database,
    Lightbulb,
    RefreshCw,
    Search,
    Shield,
    Sparkles,
    TrendingDown,
    TrendingUp,
    Users,
    Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/* ─── Types ─── */

interface DashboardCounts {
  winningPatterns: number;
  lostDealPatterns: number;
  conversationMoments: number;
  timingEntries: number;
  competitorMentions: number;
  personaPerformanceEntries: number;
  reEngagementPatterns: number;
  totalCallRemarks: number;
}

interface WinningPattern {
  id: string;
  segmentKey: string;
  openingStyle?: string;
  pitchStyle?: string;
  storyUsed?: string;
  closingApproach?: string;
  keyObjection?: string;
  objectionResponse?: string;
  conversionRate: number;
  sampleSize: number;
  confidence: number;
}

interface LostDealPattern {
  id: string;
  segmentKey: string;
  lostReason?: string;
  precedingSignals: string[];
  whatAIDid?: string;
  whatToDoInstead?: string;
  sampleSize: number;
  confidence: number;
}

interface ConversationMoment {
  id: string;
  momentType: string;
  segmentKey?: string;
  triggerPhrase?: string;
  aiResponse: string;
  outcome?: string;
  successRate: number;
  timesUsed: number;
}

interface PersonaPerf {
  id: string;
  personaName: string;
  segmentKey: string;
  totalCalls: number;
  totalConversions: number;
  conversionRate: number;
}

interface VectorPoint {
  id: string | number;
  payload: {
    text?: string;
    category?: string;
    key?: string;
    label?: string;
    outcome?: string;
    agentName?: string;
    leadName?: string;
    transcriptSummary?: string;
    type?: string;
    [key: string]: any;
  };
}

type Tab = "overview" | "winning" | "lost" | "moments" | "timing" | "personas" | "competitors" | "vector-brain";

/* ─── Category colour palette ─── */

const CATEGORY_COLORS: Record<string, { bg: string; glow: string; text: string; border: string }> = {
  company:    { bg: "#7c3aed", glow: "rgba(124,58,237,0.6)",  text: "#c4b5fd", border: "#7c3aed" },
  product:    { bg: "#0ea5e9", glow: "rgba(14,165,233,0.6)",  text: "#7dd3fc", border: "#0ea5e9" },
  strategy:   { bg: "#10b981", glow: "rgba(16,185,129,0.6)",  text: "#6ee7b7", border: "#10b981" },
  segment:    { bg: "#f59e0b", glow: "rgba(245,158,11,0.6)",  text: "#fcd34d", border: "#f59e0b" },
  market:     { bg: "#f43f5e", glow: "rgba(244,63,94,0.6)",   text: "#fda4af", border: "#f43f5e" },
  ai:         { bg: "#a855f7", glow: "rgba(168,85,247,0.6)",  text: "#d8b4fe", border: "#a855f7" },
  psychology: { bg: "#ec4899", glow: "rgba(236,72,153,0.6)",  text: "#f9a8d4", border: "#ec4899" },
  operations: { bg: "#14b8a6", glow: "rgba(20,184,166,0.6)",  text: "#5eead4", border: "#14b8a6" },
  industry:   { bg: "#f97316", glow: "rgba(249,115,22,0.6)",  text: "#fdba74", border: "#f97316" },
  transcript: { bg: "#06b6d4", glow: "rgba(6,182,212,0.6)",   text: "#67e8f9", border: "#06b6d4" },
  default:    { bg: "#6b7280", glow: "rgba(107,114,128,0.5)", text: "#d1d5db", border: "#6b7280" },
};

function getColor(category?: string) {
  return CATEGORY_COLORS[category || "default"] ?? CATEGORY_COLORS.default;
}

/* ─── Deterministic scatter layout ─── */

function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function layoutPoints(points: VectorPoint[], width: number, height: number) {
  const categories = Array.from(new Set(points.map((p) => p.payload?.category || "default")));
  const catCount = categories.length;
  const padding = 80;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;

  return points.map((pt, i) => {
    const catIndex = categories.indexOf(pt.payload?.category || "default");
    const rng = seededRandom(i * 137 + catIndex * 31);

    // Cluster centre per category
    const angle = (catIndex / catCount) * Math.PI * 2;
    const radius = Math.min(usableW, usableH) * 0.28;
    const cx = padding + usableW / 2 + Math.cos(angle) * radius;
    const cy = padding + usableH / 2 + Math.sin(angle) * radius;

    // Scatter around cluster
    const jitter = Math.min(usableW, usableH) * 0.08;
    const x = cx + (rng() - 0.5) * jitter * 2;
    const y = cy + (rng() - 0.5) * jitter * 2;

    return { ...pt, x: Math.max(padding / 2, Math.min(width - padding / 2, x)), y: Math.max(padding / 2, Math.min(height - padding / 2, y)) };
  });
}

/* ─── Vector Brain Canvas ─── */

function VectorBrainCanvas({ points, onSelect }: { points: VectorPoint[]; onSelect: (pt: VectorPoint) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const layoutRef = useRef<Array<VectorPoint & { x: number; y: number }>>([]);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);

  const W = 900, H = 560;

  useEffect(() => {
    if (!points.length) return;
    layoutRef.current = layoutPoints(points, W, H);
  }, [points]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const draw = (ts: number) => {
      timeRef.current = ts;
      ctx.clearRect(0, 0, W, H);

      // Background gradient
      const bg = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 600);
      bg.addColorStop(0, "#0f0a1f");
      bg.addColorStop(1, "#020408");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = "rgba(139,92,246,0.05)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      const pts = layoutRef.current;
      if (!pts.length) { animFrameRef.current = requestAnimationFrame(draw); return; }

      // Draw thin connection lines between same-category points
      const catGroups: Record<string, typeof pts> = {};
      for (const p of pts) {
        const cat = p.payload?.category || "default";
        if (!catGroups[cat]) catGroups[cat] = [];
        catGroups[cat].push(p);
      }

      for (const [cat, group] of Object.entries(catGroups)) {
        const col = getColor(cat);
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const dx = group[j].x - group[i].x;
            const dy = group[j].y - group[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 200) {
              ctx.beginPath();
              ctx.moveTo(group[i].x, group[i].y);
              ctx.lineTo(group[j].x, group[j].y);
              ctx.strokeStyle = col.glow.replace("0.6", String(0.08 + 0.04 * Math.sin(ts / 1000 + i)));
              ctx.lineWidth = 0.8;
              ctx.stroke();
            }
          }
        }
      }

      // Draw points
      for (const pt of pts) {
        const col = getColor(pt.payload?.category);
        const isHovered = String(pt.id) === hoveredId;
        const pulse = 1 + 0.15 * Math.sin(ts / 800 + pt.x / 80);
        const r = isHovered ? 12 : 7 * pulse;

        // Outer glow
        const grd = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r * 3);
        grd.addColorStop(0, col.glow);
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r * 3, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fillStyle = col.bg;
        ctx.shadowBlur = isHovered ? 20 : 10;
        ctx.shadowColor = col.glow;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label on hover
        if (isHovered) {
          const label = pt.payload?.label || pt.payload?.key || "Point";
          ctx.font = "bold 12px Inter, sans-serif";
          ctx.fillStyle = "white";
          ctx.shadowBlur = 6;
          ctx.shadowColor = col.glow;
          ctx.fillText(label, pt.x + 14, pt.y + 4);
          ctx.shadowBlur = 0;
        }
      }

      // Category legend
      const cats = Object.keys(catGroups);
      ctx.font = "11px Inter, sans-serif";
      cats.forEach((cat, i) => {
        const col = getColor(cat);
        const lx = 16;
        const ly = 16 + i * 22;
        ctx.beginPath();
        ctx.arc(lx + 6, ly + 6, 5, 0, Math.PI * 2);
        ctx.fillStyle = col.bg;
        ctx.shadowBlur = 6;
        ctx.shadowColor = col.glow;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = col.text;
        ctx.fillText(cat, lx + 16, ly + 10);
      });

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [hoveredId, points]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    let found: string | null = null;
    for (const pt of layoutRef.current) {
      const dx = pt.x - mx, dy = pt.y - my;
      if (dx * dx + dy * dy < 200) { found = String(pt.id); break; }
    }
    setHoveredId(found);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    for (const pt of layoutRef.current) {
      const dx = pt.x - mx, dy = pt.y - my;
      if (dx * dx + dy * dy < 200) { onSelect(pt); break; }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      style={{ cursor: hoveredId ? "pointer" : "default", width: "100%", borderRadius: "12px", display: "block" }}
    />
  );
}

/* ─── Vector Brain Tab ─── */

function VectorBrainTab() {
  const [points, setPoints] = useState<VectorPoint[]>([]);
  const [transcriptPoints, setTranscriptPoints] = useState<VectorPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [selected, setSelected] = useState<VectorPoint | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeCollection, setActiveCollection] = useState<"knowledge" | "transcripts">("knowledge");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kRes, tRes] = await Promise.all([
        aiSalesApi.getVectorBrainPoints(),
        aiSalesApi.getVectorBrainPoints("transcripts"),
      ]);
      setPoints(kRes.data.points || []);
      setTranscriptPoints(tRes.data.points || []);
    } catch {
      toast.error("Failed to load vector brain data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const { data } = await aiSalesApi.seedVectorBrain();
      toast.success(`✅ ${data.message}`);
      await load();
    } catch {
      toast.error("Seeding failed");
    } finally {
      setSeeding(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const col = activeCollection === "transcripts" ? "transcripts" : undefined;
      const { data } = await aiSalesApi.searchVectorBrain(searchQuery, col);
      setSearchResults(data.results || []);
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const displayPoints = activeCollection === "transcripts" ? transcriptPoints : points;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveCollection("knowledge")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeCollection === "knowledge"
                  ? "bg-purple-600/30 text-purple-300 border border-purple-500/50"
                  : "text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600"
              }`}
            >
              <span className="flex items-center gap-2"><Brain className="h-3.5 w-3.5" /> Knowledge ({points.length})</span>
            </button>
            <button
              onClick={() => setActiveCollection("transcripts")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeCollection === "transcripts"
                  ? "bg-cyan-600/30 text-cyan-300 border border-cyan-500/50"
                  : "text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600"
              }`}
            >
              <span className="flex items-center gap-2"><Database className="h-3.5 w-3.5" /> Call Transcripts ({transcriptPoints.length})</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white transition-all shadow-lg shadow-purple-900/30 disabled:opacity-60"
          >
            <Zap className={`h-3.5 w-3.5 ${seeding ? "animate-pulse" : ""}`} />
            {seeding ? "Seeding..." : "Seed AI Brain"}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Knowledge Points", value: points.length, color: "text-purple-400", icon: <Brain className="h-4 w-4 text-purple-400" /> },
          { label: "Call Transcripts", value: transcriptPoints.length, color: "text-cyan-400", icon: <Database className="h-4 w-4 text-cyan-400" /> },
          { label: "Categories", value: Array.from(new Set(points.map((p) => p.payload?.category))).filter(Boolean).length, color: "text-yellow-400", icon: <Sparkles className="h-4 w-4 text-yellow-400" /> },
          { label: "Total Vectors", value: points.length + transcriptPoints.length, color: "text-green-400", icon: <TrendingUp className="h-4 w-4 text-green-400" /> },
        ].map((s) => (
          <Card key={s.label} className="bg-gray-900/80 border-gray-800">
            <CardContent className="p-3 flex items-center gap-3">
              {s.icon}
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Visualization Canvas */}
      <Card className="bg-gray-950 border-gray-800 overflow-hidden">
        <CardHeader className="pb-2 border-b border-gray-800/60">
          <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            Live Vector Space — {activeCollection === "transcripts" ? "Call Transcripts" : "Agent Knowledge"}
            <span className="text-xs text-gray-600 ml-auto">Click a node to inspect</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" /> Loading vector points...
            </div>
          ) : displayPoints.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500 gap-3">
              <Brain className="h-12 w-12 text-gray-700" />
              <p className="text-sm">No data yet. Click <strong className="text-purple-400">Seed AI Brain</strong> to add initial knowledge points.</p>
            </div>
          ) : (
            <VectorBrainCanvas points={displayPoints} onSelect={setSelected} />
          )}
        </CardContent>
      </Card>

      {/* Selected Point Inspector + Semantic Search */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Node Inspector */}
        <Card className="bg-gray-900/80 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-400" /> Node Inspector
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="text-sm text-gray-600 italic">Select a node in the visualization above to inspect it.</p>
            ) : (
              <div className="space-y-2">
                {selected.payload?.category && (
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold"
                      style={{ backgroundColor: getColor(selected.payload.category).bg + "33", color: getColor(selected.payload.category).text, border: `1px solid ${getColor(selected.payload.category).border}` }}
                    >
                      {selected.payload.category}
                    </span>
                    {selected.payload?.key && <span className="text-xs text-gray-500">{selected.payload.key}</span>}
                  </div>
                )}
                {selected.payload?.label && <p className="text-sm font-semibold text-white">{selected.payload.label}</p>}
                <p className="text-sm text-gray-300 leading-relaxed">
                  {selected.payload?.text || selected.payload?.transcriptSummary || "No text content."}
                </p>
                {selected.payload?.outcome && (
                  <Badge className="bg-green-700/30 text-green-300 text-xs">{selected.payload.outcome}</Badge>
                )}
                {selected.payload?.agentName && (
                  <p className="text-xs text-gray-500">Agent: {selected.payload.agentName}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Semantic Search */}
        <Card className="bg-gray-900/80 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
              <Search className="h-4 w-4 text-cyan-400" /> Semantic Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="e.g. handling price objection..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors disabled:opacity-50"
              >
                {searching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {searchResults.length === 0 && !searching && (
                <p className="text-xs text-gray-600 italic">Search for anything — the AI will find semantically relevant knowledge.</p>
              )}
              {searchResults.map((r: any, i: number) => (
                <div key={i} className="rounded-lg p-2.5 border border-gray-800 bg-gray-800/40">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-xs font-medium px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: getColor(r.payload?.category).bg + "33", color: getColor(r.payload?.category).text }}
                    >
                      {r.payload?.category || "—"}
                    </span>
                    <span className="text-xs text-gray-500">{r.payload?.label || r.payload?.key}</span>
                    <span className="text-xs text-green-400">{(r.score * 100).toFixed(0)}% match</span>
                  </div>
                  <p className="text-xs text-gray-300 line-clamp-2">{r.payload?.text || r.payload?.transcriptSummary}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Points Table */}
      {displayPoints.length > 0 && (
        <Card className="bg-gray-900/60 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">All Memory Points ({displayPoints.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-900 border-b border-gray-800">
                  <tr className="text-gray-500">
                    <th className="text-left px-4 py-2">Category</th>
                    <th className="text-left px-4 py-2">Label</th>
                    <th className="text-left px-4 py-2 hidden md:table-cell">Text Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {displayPoints.map((pt, i) => {
                    const col = getColor(pt.payload?.category);
                    return (
                      <tr
                        key={String(pt.id)}
                        className="border-b border-gray-800/60 hover:bg-gray-800/30 cursor-pointer transition-colors"
                        onClick={() => setSelected(pt)}
                      >
                        <td className="px-4 py-2">
                          <span
                            className="px-1.5 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: col.bg + "33", color: col.text }}
                          >
                            {pt.payload?.category || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-300">{pt.payload?.label || pt.payload?.key || "—"}</td>
                        <td className="px-4 py-2 text-gray-500 hidden md:table-cell max-w-xs truncate">
                          {(pt.payload?.text || pt.payload?.transcriptSummary || "").slice(0, 80)}...
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Page ─── */

export default function IntelligencePage() {
  const [tab, setTab] = useState<Tab>("vector-brain");
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [winningPatterns, setWinningPatterns] = useState<WinningPattern[]>([]);
  const [lostPatterns, setLostPatterns] = useState<LostDealPattern[]>([]);
  const [moments, setMoments] = useState<ConversationMoment[]>([]);
  const [timing, setTiming] = useState<any[]>([]);
  const [personaPerf, setPersonaPerf] = useState<PersonaPerf[]>([]);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const { data } = await aiSalesApi.getBrainDashboard();
      setCounts(data.counts);
    } catch {
      toast.error("Failed to load brain dashboard");
    }
  }, []);

  const loadTab = useCallback(async (t: Tab) => {
    setLoading(true);
    try {
      switch (t) {
        case "winning": {
          const { data } = await aiSalesApi.getWinningPatterns();
          setWinningPatterns(data);
          break;
        }
        case "lost": {
          const { data } = await aiSalesApi.getLostDealPatterns();
          setLostPatterns(data);
          break;
        }
        case "moments": {
          const { data } = await aiSalesApi.getConversationMoments();
          setMoments(data);
          break;
        }
        case "timing": {
          const { data } = await aiSalesApi.getTimingIntelligence();
          setTiming(data);
          break;
        }
        case "personas": {
          const { data } = await aiSalesApi.getPersonaPerformance();
          setPersonaPerf(data);
          break;
        }
        case "competitors": {
          const { data } = await aiSalesApi.getCompetitorTrends();
          setCompetitors(data);
          break;
        }
        default:
          break;
      }
    } catch {
      toast.error(`Failed to load ${t} data`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (tab !== "overview" && tab !== "vector-brain") loadTab(tab);
    else setLoading(false);
  }, [tab, loadTab]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "vector-brain", label: "Vector Brain", icon: <Brain className="h-4 w-4" /> },
    { key: "overview", label: "Overview", icon: <Sparkles className="h-4 w-4" /> },
    { key: "winning", label: "Winning Patterns", icon: <TrendingUp className="h-4 w-4" /> },
    { key: "lost", label: "Lost Deal Warnings", icon: <TrendingDown className="h-4 w-4" /> },
    { key: "moments", label: "Golden Moments", icon: <Lightbulb className="h-4 w-4" /> },
    { key: "timing", label: "Timing", icon: <Clock className="h-4 w-4" /> },
    { key: "personas", label: "Personas", icon: <Users className="h-4 w-4" /> },
    { key: "competitors", label: "Competitors", icon: <Shield className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/ai-sales" className="text-gray-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Brain className="h-6 w-6 text-purple-400" />
          <h1 className="text-2xl font-bold">Central Intelligence</h1>
          <Badge variant="outline" className="border-purple-500 text-purple-300">
            AI Brain
          </Badge>
        </div>
        <button
          onClick={() => { loadDashboard(); if (tab !== "overview" && tab !== "vector-brain") loadTab(tab); }}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              tab === t.key
                ? t.key === "vector-brain"
                  ? "bg-purple-600/40 text-purple-200 border border-purple-400/60 shadow-lg shadow-purple-900/30"
                  : "bg-purple-600/30 text-purple-300 border border-purple-500/50"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {t.icon} {t.label}
            {t.key === "vector-brain" && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-500/30 text-purple-300 rounded-full">NEW</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "vector-brain" && <VectorBrainTab />}
      {tab === "overview" && <OverviewTab counts={counts} />}
      {tab === "winning" && <WinningTab data={winningPatterns} loading={loading} />}
      {tab === "lost" && <LostTab data={lostPatterns} loading={loading} />}
      {tab === "moments" && <MomentsTab data={moments} loading={loading} />}
      {tab === "timing" && <TimingTab data={timing} loading={loading} />}
      {tab === "personas" && <PersonaTab data={personaPerf} loading={loading} />}
      {tab === "competitors" && <CompetitorTab data={competitors} loading={loading} />}
    </div>
  );
}

/* ─── Overview Tab ─── */

function OverviewTab({ counts }: { counts: DashboardCounts | null }) {
  if (!counts) return <LoadingCards count={8} />;

  const stats = [
    { label: "Winning Patterns", value: counts.winningPatterns, icon: <TrendingUp className="h-5 w-5 text-green-400" />, color: "text-green-400" },
    { label: "Lost Deal Patterns", value: counts.lostDealPatterns, icon: <TrendingDown className="h-5 w-5 text-red-400" />, color: "text-red-400" },
    { label: "Conversation Moments", value: counts.conversationMoments, icon: <Sparkles className="h-5 w-5 text-yellow-400" />, color: "text-yellow-400" },
    { label: "Timing Entries", value: counts.timingEntries, icon: <Clock className="h-5 w-5 text-blue-400" />, color: "text-blue-400" },
    { label: "Competitor Mentions", value: counts.competitorMentions, icon: <Shield className="h-5 w-5 text-orange-400" />, color: "text-orange-400" },
    { label: "Persona Metrics", value: counts.personaPerformanceEntries, icon: <Users className="h-5 w-5 text-pink-400" />, color: "text-pink-400" },
    { label: "Re-engagement Patterns", value: counts.reEngagementPatterns, icon: <RefreshCw className="h-5 w-5 text-cyan-400" />, color: "text-cyan-400" },
    { label: "Call Remarks (Total)", value: counts.totalCallRemarks, icon: <Lightbulb className="h-5 w-5 text-purple-400" />, color: "text-purple-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="bg-gray-800/60 border-gray-700">
            <CardContent className="p-4 flex items-center gap-3">
              {s.icon}
              <div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gray-800/60 border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            How Central Intelligence Works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-400 space-y-2">
          <p>The Central Brain learns from every call, building institutional memory across all leads and segments.</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-green-400">Winning Patterns:</strong> Approaches that led to conversions in each segment</li>
            <li><strong className="text-red-400">Lost Deal Patterns:</strong> Warning signs and reasons deals were lost</li>
            <li><strong className="text-yellow-400">Golden Moments:</strong> Key phrases and responses that shifted conversations</li>
            <li><strong className="text-blue-400">Timing Intelligence:</strong> Best days and hours to call each segment</li>
            <li><strong className="text-pink-400">Persona Performance:</strong> Which AI persona works best for which segment</li>
            <li><strong className="text-orange-400">Competitor Intelligence:</strong> Mentions and sentiments about competitors</li>
            <li><strong className="text-purple-400">Vector Brain:</strong> Semantic knowledge stored in Qdrant for AI retrieval</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Winning Patterns Tab ─── */

function WinningTab({ data, loading }: { data: WinningPattern[]; loading: boolean }) {
  if (loading) return <LoadingCards count={4} />;
  if (!data.length) return <EmptyState label="No winning patterns yet. They appear after successful conversions." />;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.map((p) => (
        <Card key={p.id} className="bg-gray-800/60 border-gray-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="border-green-500 text-green-300">{p.segmentKey}</Badge>
              <span className="text-green-400 font-bold">{(p.conversionRate * 100).toFixed(0)}% conversion</span>
            </div>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5">
            {p.openingStyle && <Row label="Opening" value={p.openingStyle} />}
            {p.pitchStyle && <Row label="Pitch Style" value={p.pitchStyle} />}
            {p.closingApproach && <Row label="Closing" value={p.closingApproach} />}
            {p.keyObjection && <Row label="Key Objection" value={p.keyObjection} />}
            {p.objectionResponse && <Row label="Response" value={p.objectionResponse} />}
            <div className="pt-1 flex gap-3 text-xs text-gray-500">
              <span>n={p.sampleSize}</span>
              <span>conf: {(p.confidence * 100).toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ─── Lost Deal Patterns Tab ─── */

function LostTab({ data, loading }: { data: LostDealPattern[]; loading: boolean }) {
  if (loading) return <LoadingCards count={4} />;
  if (!data.length) return <EmptyState label="No lost deal patterns yet." />;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.map((p) => (
        <Card key={p.id} className="bg-gray-800/60 border-gray-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="border-red-500 text-red-300">{p.segmentKey}</Badge>
              <span className="text-xs text-gray-500">n={p.sampleSize}</span>
            </div>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5">
            {p.lostReason && <Row label="Reason" value={p.lostReason} />}
            {p.precedingSignals.length > 0 && (
              <Row label="Warning Signals" value={p.precedingSignals.join(", ")} />
            )}
            {p.whatAIDid && <Row label="What AI Did" value={p.whatAIDid} />}
            {p.whatToDoInstead && (
              <div className="text-green-400">
                <Row label="Better Approach" value={p.whatToDoInstead} />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ─── Moments Tab ─── */

function MomentsTab({ data, loading }: { data: ConversationMoment[]; loading: boolean }) {
  if (loading) return <LoadingCards count={4} />;
  if (!data.length) return <EmptyState label="No conversation moments captured yet." />;

  const typeColors: Record<string, string> = {
    golden: "border-yellow-500 text-yellow-300",
    recovery: "border-blue-500 text-blue-300",
    closing: "border-green-500 text-green-300",
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.map((m) => (
        <Card key={m.id} className="bg-gray-800/60 border-gray-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={typeColors[m.momentType] || "border-gray-500 text-gray-300"}>
                {m.momentType}
              </Badge>
              <span className="text-yellow-400 font-bold">{(m.successRate * 100).toFixed(0)}% success</span>
            </div>
          </CardHeader>
          <CardContent className="text-sm space-y-1.5">
            {m.triggerPhrase && <Row label="Trigger" value={`"${m.triggerPhrase}"`} />}
            <Row label="AI Response" value={m.aiResponse} />
            {m.outcome && <Row label="Outcome" value={m.outcome} />}
            <div className="pt-1 text-xs text-gray-500">Used {m.timesUsed} times</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ─── Timing Tab ─── */

function TimingTab({ data, loading }: { data: any[]; loading: boolean }) {
  if (loading) return <LoadingCards count={4} />;
  if (!data.length) return <EmptyState label="No timing data yet. Data accumulates as calls are made." />;

  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const sorted = [...data].sort((a, b) => {
    const dayDiff = dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
    if (dayDiff !== 0) return dayDiff;
    return a.hourSlot - b.hourSlot;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left p-2">Segment</th>
            <th className="text-left p-2">Day</th>
            <th className="text-left p-2">Hour</th>
            <th className="text-right p-2">Answer Rate</th>
            <th className="text-right p-2">Conversion</th>
            <th className="text-right p-2">Avg Duration</th>
            <th className="text-right p-2">Sample</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t: any, i: number) => (
            <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/40">
              <td className="p-2">
                <Badge variant="outline" className="border-blue-500 text-blue-300 text-xs">{t.segmentKey}</Badge>
              </td>
              <td className="p-2 capitalize">{t.dayOfWeek}</td>
              <td className="p-2">{t.hourSlot}:00</td>
              <td className="p-2 text-right text-green-400">{(t.answerRate * 100).toFixed(0)}%</td>
              <td className="p-2 text-right text-yellow-400">{(t.conversionRate * 100).toFixed(0)}%</td>
              <td className="p-2 text-right">{Math.round(t.avgCallDuration)}s</td>
              <td className="p-2 text-right text-gray-500">n={t.sampleSize}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Persona Performance Tab ─── */

function PersonaTab({ data, loading }: { data: PersonaPerf[]; loading: boolean }) {
  if (loading) return <LoadingCards count={4} />;
  if (!data.length) return <EmptyState label="No persona performance data yet." />;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.map((p) => (
        <Card key={p.id} className="bg-gray-800/60 border-gray-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{p.personaName}</CardTitle>
              <Badge variant="outline" className="border-pink-500 text-pink-300">{p.segmentKey}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Calls</span>
              <span>{p.totalCalls}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Conversions</span>
              <span className="text-green-400">{p.totalConversions}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span className="text-gray-400">Rate</span>
              <span className="text-yellow-400">{(p.conversionRate * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                style={{ width: `${Math.min(p.conversionRate * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ─── Competitor Tab ─── */

function CompetitorTab({ data, loading }: { data: any[]; loading: boolean }) {
  if (loading) return <LoadingCards count={4} />;
  if (!data.length) return <EmptyState label="No competitor mentions captured yet." />;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.map((c: any, i: number) => (
        <Card key={i} className="bg-gray-800/60 border-gray-700">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{c.competitorName}</p>
              <p className="text-xs text-gray-400">Sentiment: {c.sentiment}</p>
            </div>
            <Badge className="bg-orange-600/30 text-orange-300">{c._count} mentions</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ─── Shared Components ─── */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 shrink-0">{label}:</span>
      <span className="text-gray-200">{value}</span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <Card className="bg-gray-800/60 border-gray-700">
      <CardContent className="p-8 text-center">
        <Award className="h-12 w-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">{label}</p>
      </CardContent>
    </Card>
  );
}

function LoadingCards({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="bg-gray-800/60 border-gray-700 animate-pulse">
          <CardContent className="p-4 h-20" />
        </Card>
      ))}
    </div>
  );
}
