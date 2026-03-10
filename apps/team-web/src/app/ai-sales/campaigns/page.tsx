"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { aiSalesApi } from "@/lib/api";
import { Megaphone, Plus, Play, Pause, ArrowLeft, Users, BarChart3 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [campaignStats, setCampaignStats] = useState<any>(null);
  const [showAddLeads, setShowAddLeads] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  const [form, setForm] = useState({
    name: "", description: "", type: "outbound", agentId: "",
    maxCallsPerDay: 100, callsPerMinute: 2,
    callWindowStart: "09:00", callWindowEnd: "18:00",
  });

  const load = () => {
    setLoading(true);
    Promise.allSettled([
      aiSalesApi.listCampaigns(),
      aiSalesApi.listAgents(),
      aiSalesApi.listLeads(),
    ]).then(([campRes, agentRes, leadRes]) => {
      setCampaigns(campRes.status === "fulfilled" ? Array.isArray(campRes.value.data) ? campRes.value.data : (campRes.value.data?.data ?? []) : []);
      setAgents(agentRes.status === "fulfilled" ? Array.isArray(agentRes.value.data) ? agentRes.value.data : (agentRes.value.data?.data ?? []) : []);
      setLeads(leadRes.status === "fulfilled" ? Array.isArray(leadRes.value.data) ? leadRes.value.data : (leadRes.value.data?.data ?? []) : []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try {
      await aiSalesApi.createCampaign({
        ...form,
        maxCallsPerDay: Number(form.maxCallsPerDay),
        callsPerMinute: Number(form.callsPerMinute),
      });
      toast.success("Campaign created");
      setShowCreate(false);
      load();
    } catch { toast.error("Failed to create campaign"); }
  };

  const handleStart = async (id: string) => {
    try { await aiSalesApi.startCampaign(id); toast.success("Campaign started"); load(); }
    catch { toast.error("Failed to start campaign"); }
  };

  const handlePause = async (id: string) => {
    try { await aiSalesApi.pauseCampaign(id); toast.success("Campaign paused"); load(); }
    catch { toast.error("Failed to pause campaign"); }
  };

  const openStats = async (campaign: any) => {
    setSelectedCampaign(campaign);
    try {
      const res = await aiSalesApi.getCampaignStats(campaign.id);
      setCampaignStats(res.data);
    } catch { setCampaignStats(null); }
  };

  const handleAddLeads = async () => {
    if (!selectedCampaign || !selectedLeadIds.length) return;
    try {
      const res = await aiSalesApi.addLeadsToCampaign(selectedCampaign.id, selectedLeadIds);
      toast.success(`Added ${(res.data as any)?.added ?? 0} leads`);
      setShowAddLeads(false);
      setSelectedLeadIds([]);
      load();
    } catch { toast.error("Failed to add leads"); }
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      DRAFT: "secondary", SCHEDULED: "default", ACTIVE: "success",
      PAUSED: "warning", COMPLETED: "default", CANCELLED: "destructive",
    };
    return (map[s] || "secondary") as any;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ai-sales"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
            <p className="text-muted-foreground">Create and manage outbound call campaigns</p>
          </div>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Create Campaign</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Campaign</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Campaign Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                      <SelectItem value="re_engagement">Re-engagement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>AI Agent</Label>
                  <Select value={form.agentId} onValueChange={(v) => setForm({ ...form, agentId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                    <SelectContent>
                      {agents.filter((a: any) => a.isActive).map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Max Calls/Day</Label><Input type="number" value={form.maxCallsPerDay} onChange={(e) => setForm({ ...form, maxCallsPerDay: +e.target.value })} /></div>
                <div><Label>Calls/Min</Label><Input type="number" value={form.callsPerMinute} onChange={(e) => setForm({ ...form, callsPerMinute: +e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Call Window Start</Label><Input type="time" value={form.callWindowStart} onChange={(e) => setForm({ ...form, callWindowStart: e.target.value })} /></div>
                <div><Label>Call Window End</Label><Input type="time" value={form.callWindowEnd} onChange={(e) => setForm({ ...form, callWindowEnd: e.target.value })} /></div>
              </div>
              <Button onClick={handleCreate}>Create Campaign</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaign Cards */}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">No Campaigns Yet</h3>
            <p className="text-muted-foreground mb-4">Create your first campaign to start dialing</p>
            <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" />Create Campaign</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((camp: any) => (
            <Card key={camp.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{camp.name}</CardTitle>
                  <Badge variant={statusColor(camp.status)}>{camp.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {camp.description && <p className="text-sm text-muted-foreground">{camp.description}</p>}
                <div className="grid grid-cols-3 gap-2 text-xs text-center">
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground">Leads</p>
                    <p className="font-bold">{camp.totalLeads ?? camp._count?.campaignLeads ?? 0}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground">Called</p>
                    <p className="font-bold">{camp.totalCalled ?? 0}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground">Converted</p>
                    <p className="font-bold">{camp.totalConverted ?? 0}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Agent: <span className="font-medium">{camp.agent?.name ?? "—"}</span>
                  {camp.callWindowStart && <span> | {camp.callWindowStart}–{camp.callWindowEnd}</span>}
                </div>
                <div className="flex gap-2">
                  {camp.status === "DRAFT" || camp.status === "PAUSED" ? (
                    <Button size="sm" className="flex-1" onClick={() => handleStart(camp.id)}>
                      <Play className="mr-1 h-3 w-3" />Start
                    </Button>
                  ) : camp.status === "ACTIVE" ? (
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => handlePause(camp.id)}>
                      <Pause className="mr-1 h-3 w-3" />Pause
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => { setSelectedCampaign(camp); setShowAddLeads(true); }}>
                    <Users className="mr-1 h-3 w-3" />Add Leads
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openStats(camp)}>
                    <BarChart3 className="mr-1 h-3 w-3" />Stats
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats Dialog */}
      <Dialog open={!!campaignStats} onOpenChange={(open) => { if (!open) { setCampaignStats(null); setSelectedCampaign(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Campaign Stats: {selectedCampaign?.name}</DialogTitle></DialogHeader>
          {campaignStats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card><CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Leads</p>
                  <p className="text-xl font-bold">{campaignStats.campaign?.totalLeads ?? 0}</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Called</p>
                  <p className="text-xl font-bold">{campaignStats.campaign?.totalCalled ?? 0}</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Connected</p>
                  <p className="text-xl font-bold">{campaignStats.campaign?.totalConnected ?? 0}</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Converted</p>
                  <p className="text-xl font-bold">{campaignStats.campaign?.totalConverted ?? 0}</p>
                </CardContent></Card>
              </div>
              <Card><CardContent className="p-3">
                <p className="text-xs text-muted-foreground mb-2">Call Stats</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Total Calls: <span className="font-bold">{campaignStats.calls?.total ?? 0}</span></div>
                  <div>Avg Duration: <span className="font-bold">{campaignStats.calls?.avgDuration ?? 0}s</span></div>
                  <div>Total Cost: <span className="font-bold">${campaignStats.calls?.totalCost ?? "0.00"}</span></div>
                  <div>Avg/Call: <span className="font-bold">${campaignStats.calls?.avgCostPerCall ?? "0.00"}</span></div>
                </div>
              </CardContent></Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Leads Dialog */}
      <Dialog open={showAddLeads} onOpenChange={setShowAddLeads}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Leads to: {selectedCampaign?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {leads.map((lead: any) => (
              <label key={lead.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedLeadIds.includes(lead.id)}
                  onChange={(e) => {
                    setSelectedLeadIds((prev) =>
                      e.target.checked ? [...prev, lead.id] : prev.filter((id) => id !== lead.id)
                    );
                  }}
                  className="rounded"
                />
                <div>
                  <p className="text-sm font-medium">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.email || lead.phone || "—"}</p>
                </div>
              </label>
            ))}
          </div>
          <Button onClick={handleAddLeads} disabled={selectedLeadIds.length === 0}>
            Add {selectedLeadIds.length} Lead{selectedLeadIds.length !== 1 ? "s" : ""}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
