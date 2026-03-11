"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { aiSalesApi } from "@/lib/api";
import {
  Bot,
  Phone,
  Plus,
  TrendingUp,
  Users,
  Megaphone,
  BarChart3,
  DollarSign,
  Activity,
  ArrowRight,
  Target,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AiSalesPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [callStats, setCallStats] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      aiSalesApi.listAgents(),
      aiSalesApi.listLeads(),
      aiSalesApi.getCallStats(),
      aiSalesApi.listCampaigns(),
      aiSalesApi.getAnalyticsDashboard(),
    ]).then(([agentRes, leadRes, statsRes, campRes, analyticsRes]) => {
      setAgents(
        agentRes.status === "fulfilled"
          ? Array.isArray(agentRes.value.data) ? agentRes.value.data : (agentRes.value.data?.data ?? [])
          : [],
      );
      setLeads(
        leadRes.status === "fulfilled"
          ? Array.isArray(leadRes.value.data) ? leadRes.value.data : (leadRes.value.data?.data ?? [])
          : [],
      );
      setCallStats(statsRes.status === "fulfilled" ? statsRes.value.data : null);
      setCampaigns(
        campRes.status === "fulfilled"
          ? Array.isArray(campRes.value.data) ? campRes.value.data : (campRes.value.data?.data ?? [])
          : [],
      );
      setAnalytics(analyticsRes.status === "fulfilled" ? analyticsRes.value.data : null);
      setLoading(false);
    });
  }, []);

  const activeCampaigns = campaigns.filter((c: any) => c.status === "ACTIVE").length;
  const hotLeads = leads.filter((l: any) => l.temperature === "hot").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Sales Command Center</h1>
          <p className="text-muted-foreground">Manage AI agents, leads, campaigns, and real-time calls</p>
        </div>
        <div className="flex gap-2">
          <Link href="/ai-sales/personas">
            <Button variant="outline" size="sm"><Bot className="mr-2 h-4 w-4" />Agents</Button>
          </Link>
          <Link href="/ai-sales/campaigns">
            <Button variant="outline" size="sm"><Megaphone className="mr-2 h-4 w-4" />Campaigns</Button>
          </Link>
          <Link href="/ai-sales/analytics">
            <Button variant="outline" size="sm"><BarChart3 className="mr-2 h-4 w-4" />Analytics</Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sales Agents</CardTitle>
            <Bot className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{agents.length}</p>
            <p className="text-xs text-muted-foreground">{agents.filter((a: any) => a.isActive).length} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{leads.length}</p>
            <p className="text-xs text-emerald-500">{hotLeads} hot leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{callStats?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground">Avg {callStats?.avgDuration ?? 0}s</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Answer Rate</CardTitle>
            <TrendingUp className="h-5 w-5 text-gold-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{callStats?.answerRate ?? 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
            <Megaphone className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{campaigns.length}</p>
            <p className="text-xs text-emerald-500">{activeCampaigns} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${analytics?.costs?.total ?? "0.00"}</p>
            <p className="text-xs text-muted-foreground">${analytics?.costs?.avgPerCall ?? "0.00"}/call</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leads">Lead Pipeline</TabsTrigger>
          <TabsTrigger value="calls">Recent Calls</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Quick Actions */}
            <Card>
              <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Link href="/ai-sales/leads" className="block">
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center"><Users className="mr-2 h-4 w-4" />Manage Leads</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/ai-sales/personas" className="block">
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center"><Bot className="mr-2 h-4 w-4" />Configure Agents</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/ai-sales/campaigns" className="block">
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center"><Megaphone className="mr-2 h-4 w-4" />Launch Campaign</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/ai-sales/calls" className="block">
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center"><Phone className="mr-2 h-4 w-4" />View Call History</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/ai-sales/scripts" className="block">
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center"><Zap className="mr-2 h-4 w-4" />Script Editor</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Active Agents */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Active Agents</CardTitle>
                  <Link href="/ai-sales/personas"><Button variant="ghost" size="sm">View all</Button></Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {agents.filter((a: any) => a.isActive).slice(0, 4).map((agent: any) => (
                  <div key={agent.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-sm font-medium">{agent.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{agent._count?.callSessions ?? 0} calls</span>
                  </div>
                ))}
                {agents.filter((a: any) => a.isActive).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No active agents</p>
                )}
              </CardContent>
            </Card>

            {/* Active Campaigns */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Campaigns</CardTitle>
                  <Link href="/ai-sales/campaigns"><Button variant="ghost" size="sm">View all</Button></Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {campaigns.slice(0, 4).map((camp: any) => (
                  <div key={camp.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{camp.name}</p>
                      <p className="text-xs text-muted-foreground">{camp._count?.campaignLeads ?? 0} leads</p>
                    </div>
                    <Badge variant={camp.status === "ACTIVE" ? "success" : camp.status === "DRAFT" ? "secondary" : "warning"}>
                      {camp.status}
                    </Badge>
                  </div>
                ))}
                {campaigns.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No campaigns yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Calls Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent Calls</CardTitle>
                <Link href="/ai-sales/calls"><Button variant="ghost" size="sm">View all</Button></Link>
              </div>
            </CardHeader>
            <CardContent>
              <RecentCallsList />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lead Pipeline */}
        <TabsContent value="leads" className="space-y-4">
          <LeadPipelineTab leads={leads} onRefresh={() => window.location.reload()} />
        </TabsContent>

        {/* Calls */}
        <TabsContent value="calls">
          <RecentCallsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LeadPipelineTab({ leads, onRefresh }: { leads: any[]; onRefresh: () => void }) {
  const stages = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];
  const stageColors: Record<string, string> = {
    NEW: "secondary", CONTACTED: "default", QUALIFIED: "warning",
    PROPOSAL: "default", NEGOTIATION: "warning", WON: "success", LOST: "destructive",
  };
  const [showAddLead, setShowAddLead] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", email: "", phone: "", source: "WEBSITE", notes: "" });

  const handleCreateLead = async () => {
    try {
      await aiSalesApi.createLead(leadForm);
      toast.success("Lead created");
      setShowAddLead(false);
      setLeadForm({ name: "", email: "", phone: "", source: "WEBSITE", notes: "" });
      onRefresh();
    } catch { toast.error("Failed to create lead"); }
  };

  const moveStage = async (leadId: string, stage: string) => {
    try { await aiSalesApi.moveLeadStage(leadId, stage); onRefresh(); }
    catch { toast.error("Failed to move lead"); }
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <Link href="/ai-sales/leads"><Button variant="outline">Full Lead Manager</Button></Link>
        <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Lead</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Lead</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Name</Label><Input value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Email</Label><Input type="email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} /></div>
              </div>
              <div>
                <Label>Source</Label>
                <Select value={leadForm.source} onValueChange={(v) => setLeadForm({ ...leadForm, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["WEBSITE", "REFERRAL", "SOCIAL_MEDIA", "WALK_IN", "COLD_CALL", "OTHER"].map((s) => (
                      <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea value={leadForm.notes} onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })} /></div>
              <Button onClick={handleCreateLead}>Create Lead</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-[900px]">
          {stages.map((stage) => {
            const stageLeads = leads.filter((l: any) => l.stage === stage);
            return (
              <div key={stage} className="flex-1 min-w-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{stage.replace(/_/g, " ")}</h3>
                  <Badge variant={stageColors[stage] as any}>{stageLeads.length}</Badge>
                </div>
                <div className="space-y-2 min-h-[200px] rounded-lg bg-muted/30 p-2">
                  {stageLeads.map((lead: any) => (
                    <Card key={lead.id}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{lead.name}</p>
                          {lead.temperature && (
                            <Badge variant={lead.temperature === "hot" ? "destructive" : lead.temperature === "warm" ? "warning" : "secondary"} className="text-[9px]">
                              {lead.temperature}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{lead.email}</p>
                        {lead.score != null && <p className="text-xs text-muted-foreground">Score: {lead.score}/100</p>}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {stages.filter((s) => s !== stage).slice(0, 3).map((s) => (
                            <Button key={s} variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => moveStage(lead.id, s)}>
                              {s.replace(/_/g, " ")}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function RecentCallsList() {
  const [calls, setCalls] = useState<any[]>([]);
  useEffect(() => {
    aiSalesApi.listCalls().then((res) => {
      setCalls(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
    }).catch(() => {});
  }, []);

  if (calls.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">No calls recorded yet</div>
    );
  }

  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left">Lead</th>
            <th className="p-3 text-left">Agent</th>
            <th className="p-3 text-center">Status</th>
            <th className="p-3 text-center">Duration</th>
            <th className="p-3 text-center">Sentiment</th>
            <th className="p-3 text-right">Cost</th>
            <th className="p-3 text-left">Date</th>
          </tr>
        </thead>
        <tbody>
          {calls.slice(0, 10).map((call: any) => (
            <tr key={call.id} className="border-b hover:bg-muted/20">
              <td className="p-3">{call.lead?.name ?? "—"}</td>
              <td className="p-3">{call.agent?.name ?? "—"}</td>
              <td className="p-3 text-center">
                <Badge variant={call.status === "COMPLETED" ? "success" : call.status === "FAILED" ? "destructive" : "warning"}>
                  {call.status}
                </Badge>
              </td>
              <td className="p-3 text-center">{call.duration ? `${Math.floor(call.duration / 60)}:${String(call.duration % 60).padStart(2, "0")}` : "—"}</td>
              <td className="p-3 text-center">
                {call.sentiment ? <Badge variant={call.sentiment === "POSITIVE" || call.sentiment === "VERY_POSITIVE" ? "success" : call.sentiment === "NEGATIVE" ? "destructive" : "secondary"}>{call.sentiment}</Badge> : "—"}
              </td>
              <td className="p-3 text-right">{call.totalCost != null ? `$${call.totalCost.toFixed(4)}` : "—"}</td>
              <td className="p-3">{call.startedAt ? new Date(call.startedAt).toLocaleDateString() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
