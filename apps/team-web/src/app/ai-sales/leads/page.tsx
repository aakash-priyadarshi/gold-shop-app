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
import { Users, Plus, Search, ArrowLeft, Target, Phone, Thermometer, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];
const SOURCES = ["WEBSITE", "REFERRAL", "SOCIAL_MEDIA", "WALK_IN", "COLD_CALL", "INBOUND", "OTHER"];
const TEMPERATURES = ["hot", "warm", "cold"];

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [scoring, setScoring] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", phone: "", source: "WEBSITE", notes: "",
    company: "", role: "", timezone: "", countryCode: "",
  });

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (stageFilter) params.stage = stageFilter;
    if (sourceFilter) params.source = sourceFilter;
    aiSalesApi.listLeads(params).then((res) => {
      setLeads(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [stageFilter, sourceFilter]);

  const handleCreate = async () => {
    try {
      const clean: any = {};
      Object.entries(form).forEach(([k, v]) => { if (v) clean[k] = v; });
      await aiSalesApi.createLead(clean);
      toast.success("Lead created");
      setShowCreate(false);
      setForm({ name: "", email: "", phone: "", source: "WEBSITE", notes: "", company: "", role: "", timezone: "", countryCode: "" });
      load();
    } catch { toast.error("Failed to create lead"); }
  };

  const moveStage = async (leadId: string, stage: string) => {
    try { await aiSalesApi.moveLeadStage(leadId, stage); load(); }
    catch { toast.error("Failed"); }
  };

  const handleBulkScore = async () => {
    setScoring(true);
    try {
      const res = await aiSalesApi.bulkScoreLeads();
      toast.success(`Scored ${(res.data as any)?.scored ?? 0} leads`);
      load();
    } catch { toast.error("Scoring failed"); }
    setScoring(false);
  };

  const loadScore = async (leadId: string) => {
    try {
      const res = await aiSalesApi.getLeadScore(leadId);
      setSelectedLead({ ...selectedLead, score: res.data });
    } catch { toast.error("Failed to load score"); }
  };

  const tempColor = (t: string) =>
    t === "hot" ? "destructive" : t === "warm" ? "warning" : "secondary";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ai-sales"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lead Manager</h1>
            <p className="text-muted-foreground">Full lead management with scoring and enrichment</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBulkScore} disabled={scoring}>
            <Star className="mr-2 h-4 w-4" />{scoring ? "Scoring..." : "Score All Leads"}
          </Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Lead</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add Lead</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Role</Label><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. CEO, Manager" /></div>
                  <div>
                    <Label>Source</Label>
                    <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SOURCES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Timezone</Label><Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} placeholder="Asia/Kolkata" /></div>
                  <div><Label>Country Code</Label><Input value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })} placeholder="IN" /></div>
                </div>
                <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <Button onClick={handleCreate}>Create Lead</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Stages" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Stages</SelectItem>
            {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Sources" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sources</SelectItem>
            {SOURCES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        {TEMPERATURES.map((t) => {
          const count = leads.filter((l) => l.temperature === t).length;
          return (
            <Card key={t}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground capitalize">{t} Leads</p>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
                <Thermometer className={`h-5 w-5 ${t === "hot" ? "text-red-500" : t === "warm" ? "text-orange-500" : "text-blue-500"}`} />
              </CardContent>
            </Card>
          );
        })}
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{leads.length}</p>
            </div>
            <Users className="h-5 w-5 text-purple-500" />
          </CardContent>
        </Card>
      </div>

      {/* Lead Table */}
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Contact</th>
              <th className="p-3 text-center">Stage</th>
              <th className="p-3 text-center">Temperature</th>
              <th className="p-3 text-center">Score</th>
              <th className="p-3 text-center">Calls</th>
              <th className="p-3 text-left">Source</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead: any) => (
              <tr key={lead.id} className="border-b hover:bg-muted/20 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                <td className="p-3">
                  <p className="font-medium">{lead.name}</p>
                  {lead.company && <p className="text-xs text-muted-foreground">{lead.company}</p>}
                </td>
                <td className="p-3">
                  <p className="text-xs">{lead.email || "—"}</p>
                  <p className="text-xs text-muted-foreground">{lead.phone || "—"}</p>
                </td>
                <td className="p-3 text-center">
                  <Select value={lead.stage} onValueChange={(v) => { moveStage(lead.id, v); }}>
                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 text-center">
                  {lead.temperature ? <Badge variant={tempColor(lead.temperature)}>{lead.temperature}</Badge> : "—"}
                </td>
                <td className="p-3 text-center">
                  {lead.score != null ? (
                    <span className={`font-mono text-sm font-bold ${lead.score >= 75 ? "text-emerald-500" : lead.score >= 45 ? "text-orange-500" : "text-muted-foreground"}`}>
                      {lead.score}
                    </span>
                  ) : "—"}
                </td>
                <td className="p-3 text-center">{lead.totalCalls ?? 0}</td>
                <td className="p-3">
                  <Badge variant="outline">{(lead.source || "").replace(/_/g, " ")}</Badge>
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); loadScore(lead.id); setSelectedLead(lead); }}>
                      <Target className="h-3 w-3 mr-1" />Score
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No leads found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => { if (!open) setSelectedLead(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Lead: {selectedLead?.name}</DialogTitle></DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Email</p><p>{selectedLead.email || "—"}</p></div>
                <div><p className="text-muted-foreground">Phone</p><p>{selectedLead.phone || "—"}</p></div>
                <div><p className="text-muted-foreground">Company</p><p>{selectedLead.company || "—"}</p></div>
                <div><p className="text-muted-foreground">Role</p><p>{selectedLead.role || "—"}</p></div>
                <div><p className="text-muted-foreground">Stage</p><Badge>{selectedLead.stage}</Badge></div>
                <div><p className="text-muted-foreground">Temperature</p>
                  {selectedLead.temperature ? <Badge variant={tempColor(selectedLead.temperature)}>{selectedLead.temperature}</Badge> : <span>—</span>}
                </div>
                <div><p className="text-muted-foreground">Source</p><p>{(selectedLead.source || "").replace(/_/g, " ")}</p></div>
                <div><p className="text-muted-foreground">Total Calls</p><p>{selectedLead.totalCalls ?? 0}</p></div>
              </div>

              {selectedLead.score && typeof selectedLead.score === "object" && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Lead Score</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl font-bold">{selectedLead.score.total}</span>
                      <Badge variant={selectedLead.score.tier === "hot" ? "destructive" : selectedLead.score.tier === "warm" ? "warning" : "secondary"}>
                        {selectedLead.score.tier}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {Object.entries(selectedLead.score.breakdown || {}).map(([k, v]) => (
                        <div key={k} className="bg-muted/50 rounded p-2 text-center">
                          <p className="text-muted-foreground capitalize">{k}</p>
                          <p className="font-bold">{v as number}</p>
                        </div>
                      ))}
                    </div>
                    {selectedLead.score.suggestedAction && (
                      <p className="text-sm mt-3 bg-blue-50 dark:bg-blue-950/30 rounded p-2">
                        <strong>Suggested:</strong> {selectedLead.score.suggestedAction}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {selectedLead.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm bg-muted/30 rounded p-2">{selectedLead.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
