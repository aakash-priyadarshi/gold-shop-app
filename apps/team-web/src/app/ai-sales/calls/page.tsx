"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { aiSalesApi } from "@/lib/api";
import { Phone, ArrowLeft, Clock, DollarSign, TrendingUp, Volume2, Target, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function CallsPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      aiSalesApi.listCalls(),
      aiSalesApi.getDetailedCallStats(),
    ]).then(([callsRes, statsRes]) => {
      setCalls(
        callsRes.status === "fulfilled"
          ? Array.isArray(callsRes.value.data) ? callsRes.value.data : (callsRes.value.data?.data ?? [])
          : [],
      );
      setStats(statsRes.status === "fulfilled" ? statsRes.value.data : null);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/ai-sales"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Call History</h1>
          <p className="text-muted-foreground">View all calls with transcripts, emotions, and cost tracking</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Calls</p>
            <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-emerald-500">{stats?.completed ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Answer Rate</p>
            <p className="text-2xl font-bold">{stats?.answerRate ?? 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Avg Duration</p>
            <p className="text-2xl font-bold">{stats?.avgDuration ?? 0}s</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Cost</p>
            <p className="text-2xl font-bold">${stats?.costs?.total ?? "0.00"}</p>
            <div className="text-[10px] text-muted-foreground mt-1 space-x-2">
              <span>Twilio: ${stats?.costs?.twilio ?? "0"}</span>
              <span>LLM: ${stats?.costs?.llm ?? "0"}</span>
              <span>TTS: ${stats?.costs?.tts ?? "0"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Table */}
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left">Lead</th>
              <th className="p-3 text-left">Agent</th>
              <th className="p-3 text-center">Direction</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Duration</th>
              <th className="p-3 text-center">Sentiment</th>
              <th className="p-3 text-center">Phase</th>
              <th className="p-3 text-center">Goal</th>
              <th className="p-3 text-right">Cost</th>
              <th className="p-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call: any) => (
              <tr key={call.id} className="border-b hover:bg-muted/20 cursor-pointer" onClick={() => setSelectedCall(call)}>
                <td className="p-3">
                  <p className="font-medium">{call.lead?.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{call.toNumber || call.lead?.phone || ""}</p>
                </td>
                <td className="p-3">{call.agent?.name ?? "—"}</td>
                <td className="p-3 text-center">
                  <Badge variant="outline">{call.direction || "—"}</Badge>
                </td>
                <td className="p-3 text-center">
                  <Badge variant={call.status === "COMPLETED" ? "success" : call.status === "FAILED" ? "destructive" : call.status === "IN_PROGRESS" ? "default" : "warning"}>
                    {call.status}
                  </Badge>
                </td>
                <td className="p-3 text-center">
                  {call.duration ? `${Math.floor(call.duration / 60)}:${String(call.duration % 60).padStart(2, "0")}` : "—"}
                </td>
                <td className="p-3 text-center">
                  {call.sentiment ? (
                    <Badge variant={call.sentiment === "POSITIVE" || call.sentiment === "VERY_POSITIVE" ? "success" : call.sentiment === "NEGATIVE" ? "destructive" : "secondary"}>
                      {call.sentiment}
                    </Badge>
                  ) : "—"}
                </td>
                <td className="p-3 text-center text-xs">{call.callPhaseReached || "—"}</td>
                <td className="p-3 text-center">
                  {call.goalForCall ? (
                    <div className="flex items-center justify-center gap-1">
                      {call.goalAchieved === true ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      ) : call.goalAchieved === false ? (
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      ) : (
                        <Target className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  ) : "—"}
                </td>
                <td className="p-3 text-right">{call.totalCost != null ? `$${call.totalCost.toFixed(4)}` : "—"}</td>
                <td className="p-3 text-xs">{call.startedAt ? new Date(call.startedAt).toLocaleString() : "—"}</td>
              </tr>
            ))}
            {calls.length === 0 && (
              <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">No calls recorded yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Call Detail Dialog */}
      <Dialog open={!!selectedCall} onOpenChange={(open) => { if (!open) setSelectedCall(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Call with {selectedCall?.lead?.name || "Unknown"}
            </DialogTitle>
          </DialogHeader>
          {selectedCall && (
            <div className="space-y-4">
              {/* Call Info */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-muted/30 rounded p-3">
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge variant={selectedCall.status === "COMPLETED" ? "success" : "warning"}>{selectedCall.status}</Badge>
                </div>
                <div className="bg-muted/30 rounded p-3">
                  <p className="text-muted-foreground text-xs">Duration</p>
                  <p className="font-bold">{selectedCall.duration ? `${Math.floor(selectedCall.duration / 60)}m ${selectedCall.duration % 60}s` : "—"}</p>
                </div>
                <div className="bg-muted/30 rounded p-3">
                  <p className="text-muted-foreground text-xs">Cost</p>
                  <p className="font-bold">{selectedCall.totalCost != null ? `$${selectedCall.totalCost.toFixed(4)}` : "—"}</p>
                </div>
              </div>

              {/* Cost Breakdown */}
              {(selectedCall.costTwilio || selectedCall.costLlm || selectedCall.costTts || selectedCall.costStt) && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" />Cost Breakdown</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-2 text-xs text-center">
                      <div className="bg-muted/50 rounded p-2"><p className="text-muted-foreground">Twilio</p><p className="font-bold">${selectedCall.costTwilio?.toFixed(4) ?? "0"}</p></div>
                      <div className="bg-muted/50 rounded p-2"><p className="text-muted-foreground">LLM</p><p className="font-bold">${selectedCall.costLlm?.toFixed(4) ?? "0"}</p></div>
                      <div className="bg-muted/50 rounded p-2"><p className="text-muted-foreground">TTS</p><p className="font-bold">${selectedCall.costTts?.toFixed(4) ?? "0"}</p></div>
                      <div className="bg-muted/50 rounded p-2"><p className="text-muted-foreground">STT</p><p className="font-bold">${selectedCall.costStt?.toFixed(4) ?? "0"}</p></div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Goal */}
              {selectedCall.goalForCall && (
                <Card className={selectedCall.goalAchieved === true ? "border-green-200 dark:border-green-900" : selectedCall.goalAchieved === false ? "border-red-200 dark:border-red-900" : ""}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4" />
                      <p className="text-sm font-medium">Call Goal</p>
                      {selectedCall.goalAchieved === true && <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />Achieved</Badge>}
                      {selectedCall.goalAchieved === false && <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Not Achieved</Badge>}
                    </div>
                    <p className="text-sm">{selectedCall.goalForCall}</p>
                    {selectedCall.goalNotes && <p className="text-xs text-muted-foreground mt-1">{selectedCall.goalNotes}</p>}
                  </CardContent>
                </Card>
              )}

              {/* Insights */}
              <div className="grid grid-cols-2 gap-4">
                {selectedCall.buyingSignals?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" />Buying Signals</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {selectedCall.buyingSignals.map((s: string, i: number) => (
                          <p key={i} className="text-xs bg-emerald-50 dark:bg-emerald-950/30 rounded p-1.5">{s}</p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {selectedCall.objectionsEncountered?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Volume2 className="h-4 w-4 text-red-500" />Objections</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {selectedCall.objectionsEncountered.map((o: string, i: number) => (
                          <p key={i} className="text-xs bg-red-50 dark:bg-red-950/30 rounded p-1.5">{o}</p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Key Topics */}
              {selectedCall.keyTopics?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Key Topics</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedCall.keyTopics.map((t: string, i: number) => (
                      <Badge key={i} variant="outline">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Follow-up */}
              {selectedCall.followUpNeeded && (
                <Card className="border-orange-200 dark:border-orange-900">
                  <CardContent className="p-3">
                    <p className="text-sm font-medium text-orange-600">Follow-up Needed</p>
                    {selectedCall.followUpNotes && <p className="text-xs text-muted-foreground mt-1">{selectedCall.followUpNotes}</p>}
                  </CardContent>
                </Card>
              )}

              {/* Summary */}
              {selectedCall.summary && (
                <div>
                  <p className="text-sm font-medium mb-2">Call Summary</p>
                  <p className="text-sm bg-muted/30 rounded p-3 whitespace-pre-wrap">{selectedCall.summary}</p>
                </div>
              )}

              {/* Transcript */}
              {selectedCall.transcript && (
                <div>
                  <p className="text-sm font-medium mb-2">Transcript</p>
                  <div className="bg-muted/20 rounded p-3 max-h-[300px] overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap font-mono">{selectedCall.transcript}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
