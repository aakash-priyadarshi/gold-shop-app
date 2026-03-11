"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aiSalesApi } from "@/lib/api";
import {
  ArrowLeft,
  Check,
  Clock,
  Disc,
  MessageSquare,
  Mic,
  Play,
  Plus,
  RefreshCw,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Tab = "list" | "detail";

interface Recording {
  id: string;
  callSessionId: string;
  recordingUrl: string;
  duration?: number;
  fileSize?: number;
  format?: string;
  transcriptSynced: boolean;
  createdAt: string;
  callSession?: {
    id: string;
    leadId: string;
    status: string;
    duration: number;
    callOutcome?: string;
    lead?: { name: string; phone: string };
  };
  _count?: { annotations: number };
}

interface Annotation {
  id: string;
  recordingId: string;
  timestampSec: number;
  endTimestampSec?: number;
  annotationType: string;
  text: string;
  sentiment?: string;
  createdBy?: string;
  isVerified: boolean;
  createdAt: string;
}

interface RecordingDetail extends Recording {
  annotations: Annotation[];
  callSession?: {
    id: string;
    leadId: string;
    status: string;
    duration: number;
    callOutcome?: string;
    startedAt?: string;
    endedAt?: string;
    lead?: { name: string; phone: string; segment?: string };
    agent?: { name: string };
  };
}

const ANNOTATION_TYPES = [
  "golden_moment",
  "mistake",
  "objection_handled",
  "rapport_built",
  "coaching_note",
];

export default function RecordingsPage() {
  const [tab, setTab] = useState<Tab>("list");
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<RecordingDetail | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [annotationForm, setAnnotationForm] = useState({
    timestampSec: 0,
    endTimestampSec: 0,
    annotationType: "coaching_note",
    text: "",
    sentiment: "neutral",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, statsRes] = await Promise.all([
        aiSalesApi.listRecordings(),
        aiSalesApi.getRecordingStats(),
      ]);
      setRecordings(recRes.data.recordings);
      setTotal(recRes.data.total);
      setStats(statsRes.data);
    } catch {
      toast.error("Failed to load recordings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (callSessionId: string) => {
    try {
      const { data } = await aiSalesApi.getRecording(callSessionId);
      setDetail(data);
      setTab("detail");
    } catch {
      toast.error("Failed to load recording");
    }
  };

  const addAnnotation = async () => {
    if (!detail || !annotationForm.text.trim()) return;
    try {
      await aiSalesApi.addAnnotation(detail.id, {
        timestampSec: annotationForm.timestampSec,
        endTimestampSec: annotationForm.endTimestampSec || undefined,
        annotationType: annotationForm.annotationType,
        text: annotationForm.text,
        sentiment: annotationForm.sentiment,
      });
      toast.success("Annotation added");
      // Reload detail
      const { data } = await aiSalesApi.getRecording(detail.callSessionId);
      setDetail(data);
      setAnnotationForm({ ...annotationForm, text: "" });
    } catch {
      toast.error("Failed to add annotation");
    }
  };

  const verify = async (id: string) => {
    await aiSalesApi.verifyAnnotation(id);
    toast.success("Verified");
    if (detail) {
      const { data } = await aiSalesApi.getRecording(detail.callSessionId);
      setDetail(data);
    }
  };

  const deleteAnnotation = async (id: string) => {
    await aiSalesApi.deleteAnnotation(id);
    toast.success("Deleted");
    if (detail) {
      const { data } = await aiSalesApi.getRecording(detail.callSessionId);
      setDetail(data);
    }
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return "—";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const annotationColor = (type: string) => {
    const colors: Record<string, string> = {
      golden_moment: "bg-amber-500/10 text-amber-400",
      mistake: "bg-red-500/10 text-red-400",
      objection_handled: "bg-purple-500/10 text-purple-400",
      rapport_built: "bg-green-500/10 text-green-400",
      coaching_note: "bg-blue-500/10 text-blue-400",
    };
    return colors[type] || "bg-zinc-500/10 text-zinc-400";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {tab === "detail" ? (
            <button onClick={() => setTab("list")} className="text-zinc-400 hover:text-white"><ArrowLeft className="h-5 w-5" /></button>
          ) : (
            <Link href="/ai-sales" className="text-zinc-400 hover:text-white"><ArrowLeft className="h-5 w-5" /></Link>
          )}
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Disc className="h-6 w-6 text-red-400" />
            {tab === "detail" ? "Recording Detail" : "Call Recordings"}
          </h1>
        </div>
        <button onClick={load} className="flex items-center gap-1 rounded bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>

      {/* Stats */}
      {tab === "list" && stats && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-zinc-800 bg-zinc-900"><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{stats.totalRecordings}</div><div className="text-xs text-zinc-500">Recordings</div></CardContent></Card>
          <Card className="border-zinc-800 bg-zinc-900"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-blue-400">{stats.totalAnnotations}</div><div className="text-xs text-zinc-500">Annotations</div></CardContent></Card>
          <Card className="border-zinc-800 bg-zinc-900"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-green-400">{stats.totalDurationMinutes}m</div><div className="text-xs text-zinc-500">Total Duration</div></CardContent></Card>
        </div>
      )}

      {/* Detail View */}
      {tab === "detail" && detail && (
        <div className="space-y-4">
          {/* Recording Info */}
          <Card className="border-zinc-800 bg-zinc-900">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{detail.callSession?.lead?.name || "Unknown"}</h3>
                  <div className="text-sm text-zinc-400">
                    Agent: {detail.callSession?.agent?.name} · {detail.callSession?.lead?.phone} · {formatDuration(detail.duration)}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{detail.callSession?.callOutcome || "no outcome"}</Badge>
                    <Badge variant="outline">{detail.format || "mp3"}</Badge>
                    {detail.callSession?.lead?.segment && (
                      <Badge variant="outline">{detail.callSession.lead.segment}</Badge>
                    )}
                  </div>
                </div>
                {detail.recordingUrl && (
                  <audio controls className="max-w-xs">
                    <source src={detail.recordingUrl} type={`audio/${detail.format || "mp3"}`} />
                  </audio>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Add Annotation Form */}
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader><CardTitle className="text-sm">Add Annotation</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">Start (sec)</label>
                  <input type="number" value={annotationForm.timestampSec} onChange={e => setAnnotationForm({...annotationForm, timestampSec: parseInt(e.target.value) || 0})} className="w-full rounded bg-zinc-800 px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">End (sec)</label>
                  <input type="number" value={annotationForm.endTimestampSec} onChange={e => setAnnotationForm({...annotationForm, endTimestampSec: parseInt(e.target.value) || 0})} className="w-full rounded bg-zinc-800 px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">Type</label>
                  <select value={annotationForm.annotationType} onChange={e => setAnnotationForm({...annotationForm, annotationType: e.target.value})} className="w-full rounded bg-zinc-800 px-2 py-1.5 text-sm">
                    {ANNOTATION_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-zinc-500">Sentiment</label>
                  <select value={annotationForm.sentiment} onChange={e => setAnnotationForm({...annotationForm, sentiment: e.target.value})} className="w-full rounded bg-zinc-800 px-2 py-1.5 text-sm">
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="negative">Negative</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <input value={annotationForm.text} onChange={e => setAnnotationForm({...annotationForm, text: e.target.value})} className="flex-1 rounded bg-zinc-800 px-3 py-2 text-sm" placeholder="Annotation note..." onKeyDown={e => e.key === "Enter" && addAnnotation()} />
                <button onClick={addAnnotation} className="rounded bg-red-600 px-4 py-2 text-sm hover:bg-red-500"><Plus className="h-4 w-4" /></button>
              </div>
            </CardContent>
          </Card>

          {/* Annotations Timeline */}
          <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader><CardTitle className="text-sm">Annotations ({detail.annotations?.length || 0})</CardTitle></CardHeader>
            <CardContent>
              {(!detail.annotations || detail.annotations.length === 0) ? (
                <p className="text-sm text-zinc-500 text-center py-4">No annotations yet. Add one above or use AI suggestions.</p>
              ) : (
                <div className="space-y-2">
                  {detail.annotations.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 rounded bg-zinc-800/50 p-3">
                      <div className="text-center min-w-[60px]">
                        <div className="text-sm font-mono font-bold">{formatDuration(a.timestampSec)}</div>
                        {a.endTimestampSec && <div className="text-xs text-zinc-500">→ {formatDuration(a.endTimestampSec)}</div>}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={annotationColor(a.annotationType)}>{a.annotationType.replace(/_/g, " ")}</Badge>
                          {a.isVerified && <Badge className="bg-green-500/10 text-green-400"><Check className="h-3 w-3 mr-1" />Verified</Badge>}
                          {a.sentiment && <span className="text-xs text-zinc-500">{a.sentiment}</span>}
                        </div>
                        <p className="text-sm">{a.text}</p>
                      </div>
                      <div className="flex gap-1">
                        {!a.isVerified && (
                          <button onClick={() => verify(a.id)} className="rounded bg-green-600/20 p-1 text-green-400 hover:bg-green-600/30" title="Verify"><Check className="h-3.5 w-3.5" /></button>
                        )}
                        <button onClick={() => deleteAnnotation(a.id)} className="rounded bg-red-600/20 p-1 text-red-400 hover:bg-red-600/30" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recordings List */}
      {tab === "list" && (
        loading ? (
          <div className="text-center text-zinc-500 py-10">Loading recordings...</div>
        ) : recordings.length === 0 ? (
          <Card className="border-zinc-800 bg-zinc-900 p-10 text-center text-zinc-500">
            No recordings yet. Recordings are saved automatically after calls.
          </Card>
        ) : (
          <div className="space-y-3">
            {recordings.map((rec) => (
              <Card key={rec.id} className="border-zinc-800 bg-zinc-900 cursor-pointer hover:border-zinc-700 transition" onClick={() => openDetail(rec.callSessionId)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mic className="h-5 w-5 text-red-400" />
                    <div>
                      <div className="font-medium">{rec.callSession?.lead?.name || "Unknown Lead"}</div>
                      <div className="text-xs text-zinc-500">
                        {rec.callSession?.lead?.phone} · {formatDuration(rec.duration)} · {rec.callSession?.callOutcome || ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {(rec._count?.annotations || 0) > 0 && (
                      <Badge variant="outline">{rec._count?.annotations} annotations</Badge>
                    )}
                    <span className="text-xs text-zinc-500">{new Date(rec.createdAt).toLocaleDateString()}</span>
                    <Play className="h-4 w-4 text-zinc-500" />
                  </div>
                </CardContent>
              </Card>
            ))}
            {total > recordings.length && (
              <div className="text-center text-xs text-zinc-500">Showing {recordings.length} of {total}</div>
            )}
          </div>
        )
      )}
    </div>
  );
}
