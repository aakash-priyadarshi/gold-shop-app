"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aiSalesApi } from "@/lib/api";
import {
  Activity,
  ArrowLeft,
  Heart,
  Frown,
  Meh,
  RefreshCw,
  Smile,
  Timer,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface LiveCall {
  sessionId: string;
  leadName?: string;
  agentName?: string;
  duration: number;
  currentSentiment: string;
  emotions: Array<{
    emotion: string;
    confidence: number;
    timestamp: string;
  }>;
}

interface EmotionLog {
  id: string;
  emotion: string;
  confidence: number;
  createdAt: string;
}

export default function LiveSentimentPage() {
  const [calls, setCalls] = useState<LiveCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [history, setHistory] = useState<EmotionLog[]>([]);

  const load = useCallback(async () => {
    try {
      const { data } = await aiSalesApi.getLiveSentiment();
      setCalls(data);
    } catch {
      // silent — might have no active calls
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll every 5 seconds
  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const openHistory = async (callSessionId: string) => {
    setSelectedCallId(callSessionId);
    try {
      const { data } = await aiSalesApi.getCallSentimentHistory(callSessionId);
      setHistory(data);
    } catch {
      toast.error("Failed to load sentiment history");
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const sentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "happy":
      case "excited":
      case "interested":
        return <Smile className="h-5 w-5 text-green-400" />;
      case "frustrated":
      case "angry":
      case "disappointed":
        return <Frown className="h-5 w-5 text-red-400" />;
      case "confused":
      case "hesitant":
        return <Meh className="h-5 w-5 text-yellow-400" />;
      default:
        return <Meh className="h-5 w-5 text-zinc-400" />;
    }
  };

  const sentimentColor = (sentiment: string) => {
    if (["happy", "excited", "interested"].includes(sentiment)) return "text-green-400 bg-green-500/10";
    if (["frustrated", "angry", "disappointed"].includes(sentiment)) return "text-red-400 bg-red-500/10";
    if (["confused", "hesitant"].includes(sentiment)) return "text-yellow-400 bg-yellow-500/10";
    return "text-zinc-400 bg-zinc-500/10";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ai-sales" className="text-zinc-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-green-400" />
            Live Sentiment Dashboard
          </h1>
          <div className="flex items-center gap-1 ml-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-xs text-green-400">Live</span>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1 rounded bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Active Calls Count */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardContent className="p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-green-400" />
          <div>
            <div className="text-3xl font-bold">{calls.length}</div>
            <div className="text-xs text-zinc-500">Active calls right now</div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center text-zinc-500 py-10">Checking for active calls...</div>
      ) : calls.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-900 p-10 text-center">
          <Meh className="h-12 w-12 mx-auto text-zinc-600 mb-3" />
          <p className="text-zinc-500">No active calls at the moment.</p>
          <p className="text-xs text-zinc-600 mt-1">This dashboard updates every 5 seconds when calls are in progress.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {calls.map((call) => (
            <Card
              key={call.sessionId}
              className={`border-zinc-800 bg-zinc-900 cursor-pointer hover:border-zinc-700 transition ${selectedCallId === call.sessionId ? "ring-1 ring-green-500" : ""}`}
              onClick={() => openHistory(call.sessionId)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {sentimentIcon(call.currentSentiment)}
                    <div>
                      <div className="font-medium">{call.leadName || "Unknown Lead"}</div>
                      <div className="text-xs text-zinc-500">Agent: {call.agentName}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm font-mono">
                      <Timer className="h-3.5 w-3.5 text-zinc-500" />
                      {formatDuration(call.duration)}
                    </div>
                  </div>
                </div>

                {/* Current Sentiment */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-zinc-500">Current:</span>
                  <Badge className={sentimentColor(call.currentSentiment)}>
                    {call.currentSentiment}
                  </Badge>
                </div>

                {/* Emotion Timeline */}
                {call.emotions.length > 0 && (
                  <div className="flex gap-1">
                    {call.emotions.map((e, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-2 rounded ${
                          ["happy", "excited", "interested"].includes(e.emotion) ? "bg-green-500" :
                          ["frustrated", "angry", "disappointed"].includes(e.emotion) ? "bg-red-500" :
                          ["confused", "hesitant"].includes(e.emotion) ? "bg-yellow-500" :
                          "bg-zinc-600"
                        }`}
                        title={`${e.emotion} (${(e.confidence * 100).toFixed(0)}%)`}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sentiment History */}
      {selectedCallId && history.length > 0 && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-sm">Sentiment History — {calls.find(c => c.sessionId === selectedCallId)?.leadName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {history.map((h) => (
                <div key={h.id} className="flex items-center gap-3 text-sm">
                  <span className="text-xs text-zinc-500 w-20">{new Date(h.createdAt).toLocaleTimeString()}</span>
                  <Badge className={sentimentColor(h.emotion)}>{h.emotion}</Badge>
                  <div className="flex-1 h-1.5 rounded bg-zinc-800">
                    <div className="h-1.5 rounded bg-blue-500 transition-all" style={{ width: `${h.confidence * 100}%` }} />
                  </div>
                  <span className="text-xs text-zinc-500">{(h.confidence * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
