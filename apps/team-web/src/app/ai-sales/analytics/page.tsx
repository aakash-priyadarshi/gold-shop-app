"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aiSalesApi } from "@/lib/api";
import {
  ArrowLeft, BarChart3, DollarSign, Phone, TrendingUp, Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    aiSalesApi
      .getAnalyticsDashboard()
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const callStats = data?.callStats;
  const leadPipeline = data?.leadPipeline;
  const topAgents = data?.topAgents ?? [];
  const recentCalls = data?.recentCalls ?? [];
  const costs = data?.costs;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/ai-sales">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Performance metrics, cost tracking, and pipeline insights</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-12 text-muted-foreground">Loading analytics...</div>
      ) : !data ? (
        <div className="text-center p-12 text-muted-foreground">No analytics data available yet.</div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Phone className="h-4 w-4" />Calls</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{callStats?.total ?? 0}</p>
                <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                  <span>Completed: {callStats?.completed ?? 0}</span>
                  <span>•</span>
                  <span>Avg: {callStats?.avgDuration ?? 0}s</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" />Lead Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{(leadPipeline?.new ?? 0) + (leadPipeline?.contacted ?? 0) + (leadPipeline?.qualified ?? 0) + (leadPipeline?.demo ?? 0) + (leadPipeline?.proposal ?? 0) + (leadPipeline?.negotiation ?? 0) + (leadPipeline?.won ?? 0) + (leadPipeline?.lost ?? 0)}</p>
                <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                  <span className="text-emerald-500">{leadPipeline?.won ?? 0} won</span>
                  <span>•</span>
                  <span className="text-red-500">{leadPipeline?.lost ?? 0} lost</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" />Answer Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{callStats?.total > 0 ? Math.round(((callStats?.completed ?? 0) / callStats.total) * 100) : 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">{callStats?.completed ?? 0} of {callStats?.total ?? 0} answered</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 dark:border-amber-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" />Total Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">${costs?.total ?? "0.00"}</p>
                <p className="text-xs text-muted-foreground mt-1">Avg/call: ${costs?.avgPerCall ?? "0.00"}</p>
              </CardContent>
            </Card>
          </div>

          {/* Cost Breakdown + Pipeline */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Cost Breakdown */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Cost Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: "Twilio (calls)", amount: costs?.twilio ?? 0, color: "bg-blue-500" },
                    { label: "LLM (Claude)", amount: costs?.llm ?? 0, color: "bg-purple-500" },
                    { label: "TTS (ElevenLabs)", amount: costs?.tts ?? 0, color: "bg-orange-500" },
                    { label: "STT (Deepgram)", amount: costs?.stt ?? 0, color: "bg-teal-500" },
                  ].map((item) => {
                    const total = parseFloat(costs?.total || "1") || 1;
                    const pct = ((parseFloat(String(item.amount)) / total) * 100) || 0;
                    return (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span>{item.label}</span>
                          <span className="font-medium">${parseFloat(String(item.amount)).toFixed(2)} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Lead Pipeline */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Lead Pipeline</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { stage: "New", count: leadPipeline?.new ?? 0, color: "bg-gray-400" },
                    { stage: "Contacted", count: leadPipeline?.contacted ?? 0, color: "bg-blue-400" },
                    { stage: "Qualified", count: leadPipeline?.qualified ?? 0, color: "bg-indigo-500" },
                    { stage: "Demo", count: leadPipeline?.demo ?? 0, color: "bg-purple-500" },
                    { stage: "Proposal", count: leadPipeline?.proposal ?? 0, color: "bg-amber-500" },
                    { stage: "Negotiation", count: leadPipeline?.negotiation ?? 0, color: "bg-orange-500" },
                    { stage: "Won", count: leadPipeline?.won ?? 0, color: "bg-emerald-500" },
                    { stage: "Lost", count: leadPipeline?.lost ?? 0, color: "bg-red-500" },
                  ].map((s) => {
                    const maxCount = Math.max(
                      leadPipeline?.new ?? 0, leadPipeline?.contacted ?? 0, leadPipeline?.qualified ?? 0,
                      leadPipeline?.demo ?? 0, leadPipeline?.proposal ?? 0, leadPipeline?.negotiation ?? 0,
                      leadPipeline?.won ?? 0, leadPipeline?.lost ?? 0, 1,
                    );
                    return (
                      <div key={s.stage} className="flex items-center gap-3">
                        <span className="text-xs w-20">{s.stage}</span>
                        <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                          <div className={`h-full ${s.color} rounded`} style={{ width: `${(s.count / maxCount) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold w-8 text-right">{s.count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Agents + Recent Calls */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" />Top Agents</CardTitle></CardHeader>
              <CardContent>
                {topAgents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No agent data yet</p>
                ) : (
                  <div className="space-y-3">
                    {topAgents.map((a: any, i: number) => (
                      <div key={a.id} className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground w-6">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a._count?.callSessions ?? 0} calls</p>
                        </div>
                        <Badge variant="outline">{a.language || "en"}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Recent Calls</CardTitle></CardHeader>
              <CardContent>
                {recentCalls.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent calls</p>
                ) : (
                  <div className="space-y-2">
                    {recentCalls.slice(0, 8).map((c: any) => (
                      <div key={c.id} className="flex items-center gap-3 border-b last:border-0 pb-2">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{c.lead?.name ?? "Unknown"}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {c.duration ? `${Math.floor(c.duration / 60)}:${String(c.duration % 60).padStart(2, "0")}` : "—"}
                            {c.sentiment ? ` • ${c.sentiment}` : ""}
                          </p>
                        </div>
                        <Badge variant={c.status === "COMPLETED" ? "success" : c.status === "FAILED" ? "destructive" : "secondary"} className="text-[10px]">
                          {c.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
