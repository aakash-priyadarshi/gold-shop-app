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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { aiSalesApi } from "@/lib/api";
import {
  Users, Plus, Search, ArrowLeft, Target, Thermometer, Star,
  Pencil, Brain, Heart, ShoppingCart, Clock, MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "DEMO", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];
const SOURCES = ["MANUAL", "WEBSITE", "REFERRAL", "SOCIAL_MEDIA", "AI_GENERATED", "IMPORT", "CART_ABANDON", "WISHLIST"];
const TEMPERATURES = ["hot", "warm", "cold"];

const COMMUNICATION_STYLES = ["analytical", "expressive", "driver", "amiable"];
const DECISION_STYLES = ["impulsive", "deliberate", "consensus", "data-driven", "authority"];
const PACE_PREFS = ["fast", "moderate", "slow"];
const TONE_PREFS = ["formal", "casual", "humorous", "direct"];
const URGENCY_LEVELS = ["none", "low", "medium", "high", "urgent"];

const EMPTY_FORM = {
  name: "", email: "", phone: "", source: "MANUAL", notes: "",
  company: "", role: "", timezone: "", countryCode: "",
  preferredName: "", preferredLanguage: "",
  communicationStyle: "", decisionStyle: "", pacePreference: "", tonePreference: "",
  respondsWellTo: "", getsFrustratedBy: "",
  familyDetails: "", hobbies: "", recentLifeEvents: "", notableQuotes: "",
  budgetRange: "", budgetApprover: "", urgency: "", dealValue: "",
  competitorsPros: "",
  preferredCallTime: "", preferredCallDays: "", preferredPersona: "",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [editLead, setEditLead] = useState<any>(null);
  const [scoring, setScoring] = useState(false);
  const [callRemarks, setCallRemarks] = useState<any[]>([]);
  const [remarksLoading, setRemarksLoading] = useState(false);

  const [form, setForm] = useState({ ...EMPTY_FORM });

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (stageFilter && stageFilter !== "ALL") params.stage = stageFilter;
    if (sourceFilter && sourceFilter !== "ALL") params.source = sourceFilter;
    aiSalesApi.listLeads(params).then((res) => {
      setLeads(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [stageFilter, sourceFilter]);

  const buildPayload = () => {
    const clean: any = {};
    Object.entries(form).forEach(([k, v]) => {
      if (typeof v === "string" && v.trim()) {
        // Convert comma-separated strings to arrays for array fields
        if (k === "respondsWellTo" || k === "getsFrustratedBy" || k === "preferredCallDays") {
          clean[k] = v.split(",").map((s: string) => s.trim()).filter(Boolean);
        } else if (k === "dealValue") {
          const num = parseFloat(v);
          if (!isNaN(num)) clean[k] = num;
        } else {
          clean[k] = v.trim();
        }
      }
    });
    return clean;
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    try {
      await aiSalesApi.createLead(buildPayload());
      toast.success("Lead created");
      setShowCreate(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch { toast.error("Failed to create lead"); }
  };

  const handleUpdate = async () => {
    if (!editLead) return;
    try {
      await aiSalesApi.updateLead(editLead.id, buildPayload());
      toast.success("Lead updated");
      setEditLead(null);
      setForm({ ...EMPTY_FORM });
      load();
    } catch { toast.error("Failed to update lead"); }
  };

  const openEdit = (lead: any) => {
    setForm({
      name: lead.name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      source: lead.source || "MANUAL",
      notes: lead.notes || "",
      company: lead.company || "",
      role: lead.role || "",
      timezone: lead.timezone || "",
      countryCode: lead.countryCode || "",
      preferredName: lead.preferredName || "",
      preferredLanguage: lead.preferredLanguage || "",
      communicationStyle: lead.communicationStyle || "",
      decisionStyle: lead.decisionStyle || "",
      pacePreference: lead.pacePreference || "",
      tonePreference: lead.tonePreference || "",
      respondsWellTo: (lead.respondsWellTo || []).join(", "),
      getsFrustratedBy: (lead.getsFrustratedBy || []).join(", "),
      familyDetails: lead.familyDetails || "",
      hobbies: lead.hobbies || "",
      recentLifeEvents: lead.recentLifeEvents || "",
      notableQuotes: lead.notableQuotes || "",
      budgetRange: lead.budgetRange || "",
      budgetApprover: lead.budgetApprover || "",
      urgency: lead.urgency || "",
      dealValue: lead.dealValue?.toString() || "",
      competitorsPros: lead.competitorsPros || "",
      preferredCallTime: lead.preferredCallTime || "",
      preferredCallDays: (lead.preferredCallDays || []).join(", "),
      preferredPersona: lead.preferredPersona || "",
    });
    setEditLead(lead);
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
      setSelectedLead((prev: any) => prev ? { ...prev, score: res.data } : prev);
    } catch { toast.error("Failed to load score"); }
  };

  const loadCallRemarks = useCallback(async (leadId: string) => {
    setRemarksLoading(true);
    try {
      const res = await aiSalesApi.getCallRemarks(leadId);
      setCallRemarks(Array.isArray(res.data) ? res.data : []);
    } catch { setCallRemarks([]); }
    setRemarksLoading(false);
  }, []);

  const tempColor = (t: string): "destructive" | "warning" | "secondary" =>
    t === "hot" ? "destructive" : t === "warm" ? "warning" : "secondary";

  // Reusable select helper for optional enum fields
  const OptionalSelect = ({ value, onChange, options, placeholder }: {
    value: string; onChange: (v: string) => void; options: string[]; placeholder: string;
  }) => (
    <Select value={value || "__none__"} onValueChange={(v) => onChange(v === "__none__" ? "" : v)}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">{placeholder}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  // ── Lead form with tabbed sections ──
  const leadFormTabs = (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="basic" className="text-xs">Basic</TabsTrigger>
        <TabsTrigger value="personality" className="text-xs">Personality</TabsTrigger>
        <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
        <TabsTrigger value="buying" className="text-xs">Buying</TabsTrigger>
        <TabsTrigger value="preferences" className="text-xs">Preferences</TabsTrigger>
      </TabsList>

      {/* Basic Info */}
      <TabsContent value="basic" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Preferred Name</Label><Input value={form.preferredName} onChange={(e) => setForm({ ...form, preferredName: e.target.value })} placeholder="Call me Raj" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          <div><Label>Role</Label><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="CEO, CTO, Manager..." /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Source</Label>
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Timezone</Label><Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} placeholder="Asia/Kolkata" /></div>
          <div><Label>Country Code</Label><Input value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })} placeholder="IN" /></div>
        </div>
        <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
      </TabsContent>

      {/* Personality & Communication */}
      <TabsContent value="personality" className="space-y-4 mt-4">
        <p className="text-xs text-muted-foreground">How does this lead communicate? Helps the AI adapt its conversation style.</p>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Communication Style</Label><OptionalSelect value={form.communicationStyle} onChange={(v) => setForm({ ...form, communicationStyle: v })} options={COMMUNICATION_STYLES} placeholder="Not set" /></div>
          <div><Label>Decision Style</Label><OptionalSelect value={form.decisionStyle} onChange={(v) => setForm({ ...form, decisionStyle: v })} options={DECISION_STYLES} placeholder="Not set" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Pace Preference</Label><OptionalSelect value={form.pacePreference} onChange={(v) => setForm({ ...form, pacePreference: v })} options={PACE_PREFS} placeholder="Not set" /></div>
          <div><Label>Tone Preference</Label><OptionalSelect value={form.tonePreference} onChange={(v) => setForm({ ...form, tonePreference: v })} options={TONE_PREFS} placeholder="Not set" /></div>
        </div>
        <div>
          <Label>Responds Well To</Label>
          <Input value={form.respondsWellTo} onChange={(e) => setForm({ ...form, respondsWellTo: e.target.value })} placeholder="data and numbers, case studies, short answers (comma-separated)" />
          <p className="text-[10px] text-muted-foreground mt-0.5">Comma-separated tags</p>
        </div>
        <div>
          <Label>Gets Frustrated By</Label>
          <Input value={form.getsFrustratedBy} onChange={(e) => setForm({ ...form, getsFrustratedBy: e.target.value })} placeholder="being rushed, excessive jargon, recapping (comma-separated)" />
          <p className="text-[10px] text-muted-foreground mt-0.5">Comma-separated tags</p>
        </div>
      </TabsContent>

      {/* Personal Details */}
      <TabsContent value="personal" className="space-y-4 mt-4">
        <p className="text-xs text-muted-foreground">Zero-party personal data that helps the AI build rapport.</p>
        <div><Label>Family Details</Label><Input value={form.familyDetails} onChange={(e) => setForm({ ...form, familyDetails: e.target.value })} placeholder="Has two kids, wife works in finance" /></div>
        <div><Label>Hobbies</Label><Input value={form.hobbies} onChange={(e) => setForm({ ...form, hobbies: e.target.value })} placeholder="Cricket, photography, cooking" /></div>
        <div><Label>Recent Life Events</Label><Input value={form.recentLifeEvents} onChange={(e) => setForm({ ...form, recentLifeEvents: e.target.value })} placeholder="Just moved offices, back from vacation" /></div>
        <div><Label>Notable Quotes</Label><Textarea value={form.notableQuotes} onChange={(e) => setForm({ ...form, notableQuotes: e.target.value })} placeholder="Exact phrases they said that reveal character..." rows={3} /></div>
      </TabsContent>

      {/* Buying Intelligence */}
      <TabsContent value="buying" className="space-y-4 mt-4">
        <p className="text-xs text-muted-foreground">Budget, urgency, and competitor information for better deal negotiations.</p>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Budget Range</Label><Input value={form.budgetRange} onChange={(e) => setForm({ ...form, budgetRange: e.target.value })} placeholder="50k-1L, 10k-20k" /></div>
          <div><Label>Deal Value (INR)</Label><Input type="number" value={form.dealValue} onChange={(e) => setForm({ ...form, dealValue: e.target.value })} placeholder="50000" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Budget Approver</Label><Input value={form.budgetApprover} onChange={(e) => setForm({ ...form, budgetApprover: e.target.value })} placeholder="Who else needs to approve?" /></div>
          <div><Label>Urgency</Label><OptionalSelect value={form.urgency} onChange={(v) => setForm({ ...form, urgency: v })} options={URGENCY_LEVELS} placeholder="Not set" /></div>
        </div>
        <div><Label>Competitor Pros</Label><Textarea value={form.competitorsPros} onChange={(e) => setForm({ ...form, competitorsPros: e.target.value })} placeholder="What they liked about competitors..." rows={3} /></div>
      </TabsContent>

      {/* Call Preferences */}
      <TabsContent value="preferences" className="space-y-4 mt-4">
        <p className="text-xs text-muted-foreground">When and how this lead prefers to be contacted.</p>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Preferred Call Time</Label><Input value={form.preferredCallTime} onChange={(e) => setForm({ ...form, preferredCallTime: e.target.value })} placeholder="10am-12pm" /></div>
          <div><Label>Preferred Language</Label><Input value={form.preferredLanguage} onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })} placeholder="hi, en, ta" /></div>
        </div>
        <div><Label>Preferred Call Days</Label><Input value={form.preferredCallDays} onChange={(e) => setForm({ ...form, preferredCallDays: e.target.value })} placeholder="monday, wednesday, friday (comma-separated)" /></div>
        <div><Label>Preferred AI Persona</Label><Input value={form.preferredPersona} onChange={(e) => setForm({ ...form, preferredPersona: e.target.value })} placeholder="Name of the AI persona they prefer" /></div>
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ai-sales"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lead Manager</h1>
            <p className="text-muted-foreground">Full intelligence profiles — the more you add, the smarter the AI gets</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBulkScore} disabled={scoring}>
            <Star className="mr-2 h-4 w-4" />{scoring ? "Scoring..." : "Score All"}
          </Button>
          <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) setForm({ ...EMPTY_FORM }); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Lead</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add Lead</DialogTitle></DialogHeader>
              {leadFormTabs}
              <Button onClick={handleCreate} className="w-full mt-4">Create Lead</Button>
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
          const count = leads.filter((l: any) => l.temperature === t).length;
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
              <th className="p-3 text-center">Style</th>
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
                  {lead.preferredName && <p className="text-[10px] text-blue-500">&ldquo;{lead.preferredName}&rdquo;</p>}
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
                <td className="p-3 text-center">
                  {lead.communicationStyle ? (
                    <Badge variant="outline" className="text-[10px]">{lead.communicationStyle}</Badge>
                  ) : "—"}
                </td>
                <td className="p-3">
                  <Badge variant="outline">{(lead.source || "").replace(/_/g, " ")}</Badge>
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); openEdit(lead); }}>
                      <Pencil className="h-3 w-3 mr-1" />Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); loadScore(lead.id); }}>
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

      {/* Edit Lead Dialog */}
      <Dialog open={!!editLead} onOpenChange={(open) => { if (!open) { setEditLead(null); setForm({ ...EMPTY_FORM }); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Lead: {editLead?.name}</DialogTitle></DialogHeader>
          {leadFormTabs}
          <Button onClick={handleUpdate} className="w-full mt-4">Save Changes</Button>
        </DialogContent>
      </Dialog>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead && !editLead} onOpenChange={(open) => { if (!open) setSelectedLead(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Lead: {selectedLead?.name}</DialogTitle>
              <Button variant="outline" size="sm" onClick={() => { if (selectedLead) openEdit(selectedLead); }}>
                <Pencil className="h-3 w-3 mr-1" />Edit
              </Button>
            </div>
          </DialogHeader>
          {selectedLead && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="personality" className="text-xs">Personality</TabsTrigger>
                <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
                <TabsTrigger value="buying" className="text-xs">Buying</TabsTrigger>
                <TabsTrigger value="ai-notes" className="text-xs">AI Notes</TabsTrigger>
                <TabsTrigger value="call-history" className="text-xs" onClick={() => loadCallRemarks(selectedLead.id)}>Call History</TabsTrigger>
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview" className="space-y-4 mt-4">
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
                  <div><p className="text-muted-foreground">Preferred Name</p><p>{selectedLead.preferredName || "—"}</p></div>
                  <div><p className="text-muted-foreground">Language</p><p>{selectedLead.preferredLanguage || selectedLead.languagePrimary || "—"}</p></div>
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
              </TabsContent>

              {/* Personality */}
              <TabsContent value="personality" className="space-y-4 mt-4">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Brain className="h-4 w-4 text-purple-500" />
                  Communication & Decision Style
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-muted-foreground">Communication Style</p><p className="capitalize">{selectedLead.communicationStyle || "—"}</p></div>
                  <div><p className="text-muted-foreground">Decision Style</p><p className="capitalize">{selectedLead.decisionStyle || "—"}</p></div>
                  <div><p className="text-muted-foreground">Pace</p><p className="capitalize">{selectedLead.pacePreference || "—"}</p></div>
                  <div><p className="text-muted-foreground">Tone</p><p className="capitalize">{selectedLead.tonePreference || "—"}</p></div>
                </div>
                {(selectedLead.respondsWellTo?.length > 0 || selectedLead.getsFrustratedBy?.length > 0) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1.5">Responds Well To</p>
                      <div className="flex flex-wrap gap-1">
                        {(selectedLead.respondsWellTo || []).map((t: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950/20">{t}</Badge>
                        ))}
                        {(!selectedLead.respondsWellTo || selectedLead.respondsWellTo.length === 0) && <span className="text-sm">—</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1.5">Gets Frustrated By</p>
                      <div className="flex flex-wrap gap-1">
                        {(selectedLead.getsFrustratedBy || []).map((t: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs bg-red-50 dark:bg-red-950/20">{t}</Badge>
                        ))}
                        {(!selectedLead.getsFrustratedBy || selectedLead.getsFrustratedBy.length === 0) && <span className="text-sm">—</span>}
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Personal */}
              <TabsContent value="personal" className="space-y-4 mt-4">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Heart className="h-4 w-4 text-pink-500" />
                  Personal Details (Rapport Builders)
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div><p className="text-muted-foreground">Family</p><p>{selectedLead.familyDetails || "—"}</p></div>
                  <div><p className="text-muted-foreground">Hobbies</p><p>{selectedLead.hobbies || "—"}</p></div>
                  <div><p className="text-muted-foreground">Recent Life Events</p><p>{selectedLead.recentLifeEvents || "—"}</p></div>
                  {selectedLead.notableQuotes && (
                    <div>
                      <p className="text-muted-foreground">Notable Quotes</p>
                      <p className="bg-muted/30 rounded p-2 italic text-sm">&ldquo;{selectedLead.notableQuotes}&rdquo;</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Buying */}
              <TabsContent value="buying" className="space-y-4 mt-4">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <ShoppingCart className="h-4 w-4 text-blue-500" />
                  Buying Intelligence
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-muted-foreground">Budget Range</p><p>{selectedLead.budgetRange || "—"}</p></div>
                  <div><p className="text-muted-foreground">Deal Value</p><p>{selectedLead.dealValue ? `₹${selectedLead.dealValue.toLocaleString()}` : "—"}</p></div>
                  <div><p className="text-muted-foreground">Budget Approver</p><p>{selectedLead.budgetApprover || "—"}</p></div>
                  <div><p className="text-muted-foreground">Urgency</p><p className="capitalize">{selectedLead.urgency || "—"}</p></div>
                </div>
                {selectedLead.competitorsPros && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Competitor Pros</p>
                    <p className="text-sm bg-muted/30 rounded p-2">{selectedLead.competitorsPros}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm font-medium mt-4 mb-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Call Preferences
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-muted-foreground">Preferred Call Time</p><p>{selectedLead.preferredCallTime || "—"}</p></div>
                  <div><p className="text-muted-foreground">Preferred Days</p><p>{(selectedLead.preferredCallDays || []).join(", ") || "—"}</p></div>
                  <div><p className="text-muted-foreground">Preferred Persona</p><p>{selectedLead.preferredPersona || "—"}</p></div>
                  <div><p className="text-muted-foreground">Preferred Language</p><p>{selectedLead.preferredLanguage || "—"}</p></div>
                </div>
              </TabsContent>

              {/* AI Notes */}
              <TabsContent value="ai-notes" className="space-y-4 mt-4">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <MessageSquare className="h-4 w-4 text-cyan-500" />
                  AI Post-Call Notes
                </div>
                {!selectedLead.lastCallSummary && !selectedLead.whatWorkedLastCall && !selectedLead.nextCallStrategy ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No AI notes yet — these are generated automatically after calls.</p>
                ) : (
                  <div className="space-y-3 text-sm">
                    {selectedLead.lastCallSummary && (
                      <div><p className="text-muted-foreground font-medium">Last Call Summary</p><p className="bg-muted/30 rounded p-2">{selectedLead.lastCallSummary}</p></div>
                    )}
                    {selectedLead.whatWorkedLastCall && (
                      <div><p className="text-muted-foreground font-medium">What Worked</p><p className="bg-emerald-50 dark:bg-emerald-950/20 rounded p-2">{selectedLead.whatWorkedLastCall}</p></div>
                    )}
                    {selectedLead.whatToAvoidNextCall && (
                      <div><p className="text-muted-foreground font-medium">What To Avoid</p><p className="bg-red-50 dark:bg-red-950/20 rounded p-2">{selectedLead.whatToAvoidNextCall}</p></div>
                    )}
                    {selectedLead.nextCallStrategy && (
                      <div><p className="text-muted-foreground font-medium">Next Call Strategy</p><p className="bg-blue-50 dark:bg-blue-950/20 rounded p-2">{selectedLead.nextCallStrategy}</p></div>
                    )}
                    {Array.isArray(selectedLead.openLoops) && selectedLead.openLoops.length > 0 && (
                      <div>
                        <p className="text-muted-foreground font-medium">Open Loops</p>
                        <ul className="list-disc ml-4 mt-1 space-y-0.5">
                          {selectedLead.openLoops.map((loop: string, i: number) => <li key={i}>{loop}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Call History (Remarks Timeline) */}
              <TabsContent value="call-history" className="space-y-4 mt-4">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Clock className="h-4 w-4 text-purple-500" />
                  Call-by-Call AI Remarks
                </div>
                {remarksLoading ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Loading call remarks...</p>
                ) : callRemarks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No call remarks yet — they are generated after each AI call.</p>
                ) : (
                  <div className="space-y-4">
                    {callRemarks.map((r: any) => (
                      <Card key={r.id} className="border-l-4 border-l-purple-500">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-xs">Call #{r.callNumber}</Badge>
                            <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span>
                          </div>
                          {r.personaUsed && <p className="text-xs text-muted-foreground">Persona: {r.personaUsed}</p>}
                          {r.summary && <p className="text-sm">{r.summary}</p>}
                          {r.keyTopics?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {r.keyTopics.map((t: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                              ))}
                            </div>
                          )}
                          {r.objectionsRaised?.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground font-medium">Objections</p>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {r.objectionsRaised.map((o: string, i: number) => (
                                  <Badge key={i} variant="destructive" className="text-xs">{o}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {r.buyingSignals?.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground font-medium">Buying Signals</p>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {r.buyingSignals.map((s: string, i: number) => (
                                  <Badge key={i} className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">{s}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {r.whatWorked?.length > 0 && (
                            <div><p className="text-xs text-green-600 font-medium">What Worked: {r.whatWorked.join(", ")}</p></div>
                          )}
                          {r.whatDidntWork?.length > 0 && (
                            <div><p className="text-xs text-red-500 font-medium">What Didn&apos;t Work: {r.whatDidntWork.join(", ")}</p></div>
                          )}
                          {r.nextCallStrategy && (
                            <div className="bg-blue-50 dark:bg-blue-950/20 rounded p-2 text-xs">
                              <strong>Next Call Strategy:</strong> {r.nextCallStrategy}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
