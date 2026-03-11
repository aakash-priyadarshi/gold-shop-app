"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aiSalesApi } from "@/lib/api";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  RefreshCw,
  RotateCcw,
  Timer,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Tab = "queue" | "stats";

interface FollowUp {
  id: string;
  leadId: string;
  callSessionId?: string;
  status: string;
  scheduledAt?: string;
  scheduledDay?: string;
  scheduledHour?: number;
  personaName?: string;
  scriptVariant?: string;
  openLoopsToAddress: any;
  strategyNotes?: string;
  outcome?: string;
  dormantDays?: number;
  reEngageMethod?: string;
  createdAt: string;
}

interface Stats {
  pending: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  upcoming: FollowUp[];
}

export default function FollowUpsPage() {
  const [tab, setTab] = useState<Tab>("queue");
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fuRes, statsRes] = await Promise.all([
        aiSalesApi.listFollowUps(statusFilter || undefined),
        aiSalesApi.getFollowUpStats(),
      ]);
      setFollowUps(fuRes.data);
      setStats(statsRes.data);
    } catch {
      toast.error("Failed to load follow-ups");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const cancel = async (id: string) => {
    await aiSalesApi.cancelFollowUp(id);
    toast.success("Follow-up cancelled");
    load();
  };

  const complete = async (id: string) => {
    await aiSalesApi.completeFollowUp(id, { outcome: "manual_complete" });
    toast.success("Marked complete");
    load();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "pending": return "bg-yellow-500/10 text-yellow-400";
      case "scheduled": return "bg-blue-500/10 text-blue-400";
      case "completed": return "bg-green-500/10 text-green-400";
      case "cancelled": return "bg-zinc-500/10 text-zinc-400";
      case "expired": return "bg-red-500/10 text-red-400";
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
            <Timer className="h-6 w-6 text-blue-400" />
            Smart Follow-Up Sequencer
          </h1>
        </div>
        <button onClick={load} className="flex items-center gap-1 rounded bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Pending", value: stats.pending, color: "text-yellow-400", icon: Clock },
            { label: "Scheduled", value: stats.scheduled, color: "text-blue-400", icon: Calendar },
            { label: "Completed", value: stats.completed, color: "text-green-400", icon: Check },
            { label: "Cancelled", value: stats.cancelled, color: "text-zinc-400", icon: X },
          ].map((s) => (
            <Card key={s.label} className="border-zinc-800 bg-zinc-900">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`h-8 w-8 ${s.color}`} />
                <div>
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs text-zinc-500">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-400">Filter:</span>
        {["", "pending", "scheduled", "completed", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded px-3 py-1 text-xs ${statusFilter === s ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-zinc-500 py-10">Loading follow-ups...</div>
      ) : followUps.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900 p-10 text-center text-zinc-500">
          No follow-ups found. They are auto-scheduled after each call.
        </Card>
      ) : (
        <div className="space-y-3">
          {followUps.map((fu) => (
            <Card key={fu.id} className="border-zinc-800 bg-zinc-900">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={statusColor(fu.status)}>{fu.status}</Badge>
                      {fu.personaName && <Badge variant="outline">{fu.personaName}</Badge>}
                      {fu.reEngageMethod && <Badge variant="outline" className="text-orange-400">Re-engage: {fu.reEngageMethod}</Badge>}
                    </div>
                    <div className="text-sm mt-1">
                      {fu.scheduledDay && fu.scheduledHour !== undefined && (
                        <span className="text-zinc-300">
                          <Calendar className="h-3.5 w-3.5 inline mr-1" />
                          {fu.scheduledDay} at {fu.scheduledHour}:00
                        </span>
                      )}
                      {fu.scheduledAt && (
                        <span className="text-zinc-500 ml-3">
                          {new Date(fu.scheduledAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {fu.strategyNotes && <p className="text-xs text-zinc-500 mt-1">{fu.strategyNotes}</p>}
                    {fu.openLoopsToAddress && Array.isArray(fu.openLoopsToAddress) && fu.openLoopsToAddress.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {fu.openLoopsToAddress.map((loop: string, i: number) => (
                          <span key={i} className="rounded bg-purple-500/10 px-2 py-0.5 text-xs text-purple-400">{loop}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {(fu.status === "pending" || fu.status === "scheduled") && (
                      <>
                        <button onClick={() => complete(fu.id)} className="rounded bg-green-600/20 p-1.5 text-green-400 hover:bg-green-600/30" title="Mark complete"><Check className="h-4 w-4" /></button>
                        <button onClick={() => cancel(fu.id)} className="rounded bg-red-600/20 p-1.5 text-red-400 hover:bg-red-600/30" title="Cancel"><X className="h-4 w-4" /></button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
