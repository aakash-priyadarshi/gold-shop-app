"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aiSalesApi } from "@/lib/api";
import {
  ArrowLeft,
  Award,
  Brain,
  Clock,
  Lightbulb,
  RefreshCw,
  Shield,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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

type Tab = "overview" | "winning" | "lost" | "moments" | "timing" | "personas" | "competitors";

/* ─── Page ─── */

export default function IntelligencePage() {
  const [tab, setTab] = useState<Tab>("overview");
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
    if (tab !== "overview") loadTab(tab);
    else setLoading(false);
  }, [tab, loadTab]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <Brain className="h-4 w-4" /> },
    { key: "winning", label: "Winning Patterns", icon: <TrendingUp className="h-4 w-4" /> },
    { key: "lost", label: "Lost Deal Warnings", icon: <TrendingDown className="h-4 w-4" /> },
    { key: "moments", label: "Golden Moments", icon: <Sparkles className="h-4 w-4" /> },
    { key: "timing", label: "Timing", icon: <Clock className="h-4 w-4" /> },
    { key: "personas", label: "Persona Performance", icon: <Users className="h-4 w-4" /> },
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
          onClick={() => { loadDashboard(); if (tab !== "overview") loadTab(tab); }}
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
                ? "bg-purple-600/30 text-purple-300 border border-purple-500/50"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
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
            {/* Simple bar */}
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
