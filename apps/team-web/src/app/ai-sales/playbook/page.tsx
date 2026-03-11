"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aiSalesApi } from "@/lib/api";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Tab = "list" | "create" | "search" | "stats";

interface PlaybookEntry {
  id: string;
  category: string;
  objectionPhrase: string;
  segmentKey?: string;
  responses: Array<{ technique: string; text: string; winRate: number; timesUsed: number }>;
  bestResponse?: string;
  bestTechnique?: string;
  bestWinRate: number;
  totalTimesRaised: number;
  totalTimesWon: number;
  isApproved: boolean;
  isActive: boolean;
  createdAt: string;
}

interface PlaybookStats {
  total: number;
  approved: number;
  pending: number;
  totalUsage: number;
  topByWinRate: PlaybookEntry[];
  byCategory: Record<string, number>;
}

const CATEGORIES = ["price", "timing", "competitor", "trust", "authority", "need", "feature"];

export default function PlaybookPage() {
  const [tab, setTab] = useState<Tab>("list");
  const [entries, setEntries] = useState<PlaybookEntry[]>([]);
  const [stats, setStats] = useState<PlaybookStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [form, setForm] = useState({
    category: "price",
    objectionPhrase: "",
    segmentKey: "",
    responses: '[{"technique":"value_reframe","text":"I understand the price concern...","winRate":0,"timesUsed":0}]',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, statsRes] = await Promise.all([
        aiSalesApi.listPlaybook({ category: catFilter || undefined }),
        aiSalesApi.getPlaybookStats(),
      ]);
      setEntries(res.data);
      setStats(statsRes.data);
    } catch {
      toast.error("Failed to load playbook");
    } finally {
      setLoading(false);
    }
  }, [catFilter]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    try {
      let responses;
      try { responses = JSON.parse(form.responses); } catch { toast.error("Responses must be valid JSON"); return; }
      await aiSalesApi.createPlaybookEntry({
        category: form.category,
        objectionPhrase: form.objectionPhrase,
        segmentKey: form.segmentKey || undefined,
        responses,
      });
      toast.success("Playbook entry created");
      setTab("list");
      load();
    } catch { toast.error("Failed to create entry"); }
  };

  const approve = async (id: string) => {
    await aiSalesApi.approvePlaybookEntry(id);
    toast.success("Approved");
    load();
  };

  const reject = async (id: string) => {
    await aiSalesApi.rejectPlaybookEntry(id);
    toast.success("Rejected");
    load();
  };

  const remove = async (id: string) => {
    await aiSalesApi.deletePlaybookEntry(id);
    toast.success("Deleted");
    load();
  };

  const seed = async () => {
    await aiSalesApi.seedPlaybook();
    toast.success("Default objections seeded");
    load();
  };

  const search = async () => {
    if (!searchQuery.trim()) return;
    try {
      const { data } = await aiSalesApi.findBestResponse(searchQuery);
      setSearchResult(data);
    } catch {
      toast.error("No match found");
    }
  };

  const categoryColor = (c: string) => {
    const colors: Record<string, string> = {
      price: "text-red-400 bg-red-500/10",
      timing: "text-orange-400 bg-orange-500/10",
      competitor: "text-purple-400 bg-purple-500/10",
      trust: "text-blue-400 bg-blue-500/10",
      authority: "text-yellow-400 bg-yellow-500/10",
      need: "text-green-400 bg-green-500/10",
      feature: "text-cyan-400 bg-cyan-500/10",
    };
    return colors[c] || "text-zinc-400 bg-zinc-500/10";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ai-sales" className="text-zinc-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-orange-400" />
            Objection Playbook
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1 rounded bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={seed} className="flex items-center gap-1 rounded bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700">
            <Sparkles className="h-4 w-4" /> Seed Defaults
          </button>
          <button onClick={() => setTab(tab === "create" ? "list" : "create")} className="flex items-center gap-1 rounded bg-orange-600 px-3 py-1.5 text-sm hover:bg-orange-500">
            <Plus className="h-4 w-4" /> New Entry
          </button>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="border-zinc-800 bg-zinc-900"><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-zinc-500">Total Entries</div></CardContent></Card>
          <Card className="border-zinc-800 bg-zinc-900"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-green-400">{stats.approved}</div><div className="text-xs text-zinc-500">Approved</div></CardContent></Card>
          <Card className="border-zinc-800 bg-zinc-900"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-yellow-400">{stats.pending}</div><div className="text-xs text-zinc-500">Pending</div></CardContent></Card>
          <Card className="border-zinc-800 bg-zinc-900"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-blue-400">{stats.totalUsage}</div><div className="text-xs text-zinc-500">Total Usage</div></CardContent></Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        {(["list", "search", "create", "stats"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded px-3 py-1.5 text-sm capitalize ${tab === t ? "bg-orange-600 text-white" : "text-zinc-400 hover:bg-zinc-800"}`}>{t}</button>
        ))}
      </div>

      {/* Search Tab */}
      {tab === "search" && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardContent className="p-5 space-y-4">
            <div className="flex gap-2">
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 rounded bg-zinc-800 px-3 py-2 text-sm" placeholder="Type an objection... e.g. 'It's too expensive'" onKeyDown={e => e.key === "Enter" && search()} />
              <button onClick={search} className="rounded bg-orange-600 px-4 py-2 text-sm hover:bg-orange-500"><Search className="h-4 w-4" /></button>
            </div>
            {searchResult && (
              <div className="rounded bg-zinc-800/50 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={categoryColor(searchResult.entry?.category)}>{searchResult.entry?.category}</Badge>
                  <Trophy className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-medium">{(searchResult.winRate * 100).toFixed(0)}% win rate</span>
                </div>
                <p className="text-sm text-zinc-300 italic">&ldquo;{searchResult.entry?.objectionPhrase}&rdquo;</p>
                <div className="mt-2">
                  <div className="text-xs text-zinc-500 mb-1">Best Response ({searchResult.technique}):</div>
                  <p className="text-sm text-white">{searchResult.response}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Tab */}
      {tab === "create" && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader><CardTitle>New Objection Entry</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Category</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full rounded bg-zinc-800 px-3 py-2 text-sm">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Segment Key</label>
                <input value={form.segmentKey} onChange={e => setForm({...form, segmentKey: e.target.value})} className="w-full rounded bg-zinc-800 px-3 py-2 text-sm" placeholder="e.g. high_value" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Objection Phrase</label>
              <input value={form.objectionPhrase} onChange={e => setForm({...form, objectionPhrase: e.target.value})} className="w-full rounded bg-zinc-800 px-3 py-2 text-sm" placeholder="It's too expensive" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Responses (JSON array)</label>
              <textarea value={form.responses} onChange={e => setForm({...form, responses: e.target.value})} className="w-full rounded bg-zinc-800 px-3 py-2 text-sm font-mono" rows={4} />
            </div>
            <button onClick={create} className="rounded bg-orange-600 px-4 py-2 text-sm font-medium hover:bg-orange-500">Create Entry</button>
          </CardContent>
        </Card>
      )}

      {/* Stats Tab */}
      {tab === "stats" && stats && (
        <div className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader><CardTitle>By Category</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(stats.byCategory || {}).map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <Badge className={categoryColor(cat)}>{cat}</Badge>
                    <span className="text-sm font-medium">{count as number}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          {stats.topByWinRate?.length > 0 && (
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader><CardTitle>Top by Win Rate</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {stats.topByWinRate.map((e, i) => (
                  <div key={e.id} className="flex items-center justify-between text-sm">
                    <span>#{i+1} {e.objectionPhrase}</span>
                    <span className="text-green-400">{(e.bestWinRate * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* List Tab */}
      {tab === "list" && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Category:</span>
            {["", ...CATEGORIES].map((c) => (
              <button key={c} onClick={() => setCatFilter(c)} className={`rounded px-3 py-1 text-xs ${catFilter === c ? "bg-orange-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>{c || "All"}</button>
            ))}
          </div>

          {loading ? (
            <div className="text-center text-zinc-500 py-10">Loading playbook...</div>
          ) : entries.length === 0 ? (
            <Card className="border-zinc-800 bg-zinc-900 p-10 text-center text-zinc-500">
              No entries. Click &quot;Seed Defaults&quot; to populate common objections.
            </Card>
          ) : (
            <div className="space-y-3">
              {entries.map((e) => (
                <Card key={e.id} className="border-zinc-800 bg-zinc-900">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={categoryColor(e.category)}>{e.category}</Badge>
                          {e.isApproved ? (
                            <Badge className="bg-green-500/10 text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>
                          ) : (
                            <Badge className="bg-yellow-500/10 text-yellow-400">Pending</Badge>
                          )}
                          {e.segmentKey && <Badge variant="outline">{e.segmentKey}</Badge>}
                        </div>
                        <p className="text-sm font-medium mt-1">&ldquo;{e.objectionPhrase}&rdquo;</p>
                        {e.bestResponse && (
                          <p className="text-xs text-zinc-400 mt-1">Best: {e.bestTechnique} — {(e.bestWinRate * 100).toFixed(0)}% win rate</p>
                        )}
                        <div className="text-xs text-zinc-500 mt-1">
                          Raised {e.totalTimesRaised}× · Won {e.totalTimesWon}× · {e.responses?.length || 0} responses
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {!e.isApproved && (
                          <button onClick={() => approve(e.id)} className="rounded bg-green-600/20 p-1.5 text-green-400 hover:bg-green-600/30" title="Approve"><Check className="h-4 w-4" /></button>
                        )}
                        {!e.isApproved && (
                          <button onClick={() => reject(e.id)} className="rounded bg-red-600/20 p-1.5 text-red-400 hover:bg-red-600/30" title="Reject"><X className="h-4 w-4" /></button>
                        )}
                        <button onClick={() => remove(e.id)} className="rounded bg-zinc-700/50 p-1.5 text-zinc-400 hover:bg-zinc-700" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
