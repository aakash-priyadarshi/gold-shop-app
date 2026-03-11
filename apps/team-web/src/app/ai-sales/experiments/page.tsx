"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aiSalesApi } from "@/lib/api";
import {
  ArrowLeft,
  BarChart3,
  FlaskConical,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Tab = "list" | "create";

interface Experiment {
  id: string;
  name: string;
  description?: string;
  status: string;
  experimentType: string;
  segmentKey?: string;
  variantA: any;
  variantB: any;
  variantACalls: number;
  variantAConversions: number;
  variantAConversionRate: number;
  variantBCalls: number;
  variantBConversions: number;
  variantBConversionRate: number;
  confidenceLevel: number;
  winner?: string;
  autoPromote: boolean;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export default function ExperimentsPage() {
  const [tab, setTab] = useState<Tab>("list");
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    description: "",
    experimentType: "persona",
    segmentKey: "",
    variantA: '{"label":"Variant A"}',
    variantB: '{"label":"Variant B"}',
    autoPromote: true,
  });

  const load = useCallback(async () => {
    try {
      const { data } = await aiSalesApi.listExperiments();
      setExperiments(data);
    } catch {
      toast.error("Failed to load experiments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    try {
      let vA, vB;
      try { vA = JSON.parse(form.variantA); } catch { toast.error("Variant A must be valid JSON"); return; }
      try { vB = JSON.parse(form.variantB); } catch { toast.error("Variant B must be valid JSON"); return; }
      await aiSalesApi.createExperiment({
        name: form.name,
        description: form.description,
        experimentType: form.experimentType,
        segmentKey: form.segmentKey || undefined,
        variantA: vA,
        variantB: vB,
        autoPromote: form.autoPromote,
      });
      toast.success("Experiment created");
      setTab("list");
      load();
    } catch { toast.error("Failed to create experiment"); }
  };

  const start = async (id: string) => {
    await aiSalesApi.startExperiment(id);
    toast.success("Experiment started");
    load();
  };

  const pause = async (id: string) => {
    await aiSalesApi.pauseExperiment(id);
    toast.success("Experiment paused");
    load();
  };

  const remove = async (id: string) => {
    await aiSalesApi.deleteExperiment(id);
    toast.success("Experiment deleted");
    load();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "bg-green-500/10 text-green-500";
      case "paused": return "bg-yellow-500/10 text-yellow-500";
      case "completed": return "bg-blue-500/10 text-blue-500";
      case "draft": return "bg-zinc-500/10 text-zinc-400";
      default: return "bg-zinc-500/10 text-zinc-400";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ai-sales" className="text-zinc-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-purple-400" />
            A/B Testing Engine
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1 rounded bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={() => setTab(tab === "create" ? "list" : "create")} className="flex items-center gap-1 rounded bg-purple-600 px-3 py-1.5 text-sm hover:bg-purple-500">
            <Plus className="h-4 w-4" /> {tab === "create" ? "View List" : "New Experiment"}
          </button>
        </div>
      </div>

      {tab === "create" && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader><CardTitle>Create Experiment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Name</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full rounded bg-zinc-800 px-3 py-2 text-sm" placeholder="Persona A vs B for jewelry" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Type</label>
                <select value={form.experimentType} onChange={e => setForm({...form, experimentType: e.target.value})} className="w-full rounded bg-zinc-800 px-3 py-2 text-sm">
                  <option value="persona">Persona</option>
                  <option value="script">Script</option>
                  <option value="opening">Opening</option>
                  <option value="timing">Timing</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full rounded bg-zinc-800 px-3 py-2 text-sm" rows={2} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Segment Key (optional)</label>
              <input value={form.segmentKey} onChange={e => setForm({...form, segmentKey: e.target.value})} className="w-full rounded bg-zinc-800 px-3 py-2 text-sm" placeholder="e.g. high_value" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Variant A (JSON)</label>
                <textarea value={form.variantA} onChange={e => setForm({...form, variantA: e.target.value})} className="w-full rounded bg-zinc-800 px-3 py-2 text-sm font-mono" rows={3} />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Variant B (JSON)</label>
                <textarea value={form.variantB} onChange={e => setForm({...form, variantB: e.target.value})} className="w-full rounded bg-zinc-800 px-3 py-2 text-sm font-mono" rows={3} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.autoPromote} onChange={e => setForm({...form, autoPromote: e.target.checked})} />
              Auto-promote winner at 95% confidence
            </label>
            <button onClick={create} className="rounded bg-purple-600 px-4 py-2 text-sm font-medium hover:bg-purple-500">Create Experiment</button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center text-zinc-500 py-10">Loading experiments...</div>
      ) : experiments.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900 p-10 text-center text-zinc-500">
          No experiments yet. Create one to start A/B testing!
        </Card>
      ) : (
        <div className="space-y-4">
          {experiments.map((exp) => (
            <Card key={exp.id} className="border-zinc-800 bg-zinc-900">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{exp.name}</h3>
                      <Badge className={statusColor(exp.status)}>{exp.status}</Badge>
                      <Badge variant="outline">{exp.experimentType}</Badge>
                      {exp.winner && <Badge className="bg-amber-500/10 text-amber-400"><Trophy className="h-3 w-3 mr-1" /> Winner: {exp.winner}</Badge>}
                    </div>
                    {exp.description && <p className="text-sm text-zinc-400 mb-3">{exp.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    {exp.status === "draft" && (
                      <button onClick={() => start(exp.id)} className="rounded bg-green-600/20 p-1.5 text-green-400 hover:bg-green-600/30"><Play className="h-4 w-4" /></button>
                    )}
                    {exp.status === "active" && (
                      <button onClick={() => pause(exp.id)} className="rounded bg-yellow-600/20 p-1.5 text-yellow-400 hover:bg-yellow-600/30"><Pause className="h-4 w-4" /></button>
                    )}
                    <button onClick={() => remove(exp.id)} className="rounded bg-red-600/20 p-1.5 text-red-400 hover:bg-red-600/30"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="rounded bg-zinc-800/50 p-3">
                    <div className="text-xs text-zinc-500 mb-1">Variant A</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">{(exp.variantAConversionRate * 100).toFixed(1)}%</span>
                      <span className="text-xs text-zinc-500">{exp.variantACalls} calls · {exp.variantAConversions} conversions</span>
                    </div>
                  </div>
                  <div className="rounded bg-zinc-800/50 p-3">
                    <div className="text-xs text-zinc-500 mb-1">Variant B</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">{(exp.variantBConversionRate * 100).toFixed(1)}%</span>
                      <span className="text-xs text-zinc-500">{exp.variantBCalls} calls · {exp.variantBConversions} conversions</span>
                    </div>
                  </div>
                </div>

                {exp.confidenceLevel > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-zinc-500" />
                    <div className="flex-1 h-2 rounded bg-zinc-800">
                      <div className="h-2 rounded bg-purple-500 transition-all" style={{ width: `${Math.min(exp.confidenceLevel * 100, 100)}%` }} />
                    </div>
                    <span className="text-xs text-zinc-400">{(exp.confidenceLevel * 100).toFixed(1)}% confidence</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
