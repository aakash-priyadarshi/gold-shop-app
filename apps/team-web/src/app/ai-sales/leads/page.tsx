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
    Activity,
    ArrowLeft,
    Brain,
    CalendarPlus, CheckCircle2,
    Clock,
    Heart,
    Mail,
    MessageSquare,
    Pencil,
    Phone,
    Plus, RefreshCw, Search,
    Send,
    ShoppingCart,
    Sparkles,
    Star,
    Target, Thermometer,
    Users,
    Video,
    XCircle,
    Zap,
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

  // New: Action dialogs state
  const [agents, setAgents] = useState<any[]>([]);
  const [callDialog, setCallDialog] = useState<any>(null); // lead to call
  const [callGoal, setCallGoal] = useState("");
  const [callAgentId, setCallAgentId] = useState("");
  const [callLoading, setCallLoading] = useState(false);
  const [emailDialog, setEmailDialog] = useState<any>(null); // lead to email
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailGoal, setEmailGoal] = useState("");
  const [emailIncludeMeet, setEmailIncludeMeet] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [meetDialog, setMeetDialog] = useState<any>(null); // lead for meet
  const [meetAgentId, setMeetAgentId] = useState("");
  const [meetDate, setMeetDate] = useState("");
  const [meetSubject, setMeetSubject] = useState("");
  const [meetMessage, setMeetMessage] = useState("");
  const [meetLoading, setMeetLoading] = useState(false);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [leadEmails, setLeadEmails] = useState<any[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [strategy, setStrategy] = useState<any>(null);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [joinMeetDialog, setJoinMeetDialog] = useState<any>(null);
  const [joinMeetUrl, setJoinMeetUrl] = useState("");
  const [joinMeetAgentId, setJoinMeetAgentId] = useState("");
  const [joinMeetLoading, setJoinMeetLoading] = useState(false);

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

  // Load agents for dropdowns
  useEffect(() => {
    aiSalesApi.listAgents().then((res) => {
      setAgents(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
    }).catch(() => {});
  }, []);

  const loadTimeline = useCallback(async (leadId: string) => {
    setTimelineLoading(true);
    try {
      const res = await aiSalesApi.getLeadInteractions(leadId, 50);
      setTimeline(Array.isArray(res.data) ? res.data : (res.data?.interactions ?? []));
    } catch { setTimeline([]); }
    setTimelineLoading(false);
  }, []);

  const loadLeadEmails = useCallback(async (leadId: string) => {
    setEmailsLoading(true);
    try {
      const res = await aiSalesApi.getLeadEmails(leadId);
      setLeadEmails(Array.isArray(res.data) ? res.data : []);
    } catch { setLeadEmails([]); }
    setEmailsLoading(false);
  }, []);

  const handleCallFromLead = async () => {
    if (!callDialog || !callAgentId) { toast.error("Select an agent"); return; }
    // Validate E.164 phone format
    const phone = callDialog.phone?.trim();
    if (!phone || !/^\+[1-9]\d{6,14}$/.test(phone)) {
      toast.error("Invalid phone number — must be in E.164 format, e.g. +919876543210");
      return;
    }
    setCallLoading(true);
    try {
      await aiSalesApi.initiateCall({ agentId: callAgentId, leadId: callDialog.id, goal: callGoal || undefined });
      toast.success("Call initiated!");
      setCallDialog(null);
      setCallGoal("");
      setCallAgentId("");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to initiate call";
      toast.error(msg);
    }
    setCallLoading(false);
  };

  const handleSendEmail = async () => {
    if (!emailDialog || !emailSubject.trim() || !emailBody.trim()) { toast.error("Subject and body required"); return; }
    setEmailLoading(true);
    try {
      await aiSalesApi.sendEmail({
        leadId: emailDialog.id,
        subject: emailSubject,
        body: emailBody,
        goalForEmail: emailGoal || undefined,
        meetLink: emailIncludeMeet ? "auto" : undefined,
      });
      toast.success("Email sent!");
      setEmailDialog(null);
      setEmailSubject("");
      setEmailBody("");
      setEmailGoal("");
      setEmailIncludeMeet(false);
    } catch { toast.error("Failed to send email"); }
    setEmailLoading(false);
  };

  const handleGenerateDraft = async () => {
    if (!emailDialog) return;
    setEmailLoading(true);
    try {
      const res = await aiSalesApi.generateEmailDraft({
        leadId: emailDialog.id,
        purpose: emailGoal || "Follow up and build relationship",
        includeMeetLink: emailIncludeMeet,
      });
      const draft = res.data as any;
      setEmailSubject(draft.subject || "");
      setEmailBody(draft.body || "");
      toast.success("AI draft generated");
    } catch { toast.error("Failed to generate draft"); }
    setEmailLoading(false);
  };

  const handleScheduleMeet = async () => {
    if (!meetDialog || !meetAgentId || !meetDate) { toast.error("Fill all fields"); return; }
    if (new Date(meetDate) <= new Date()) { toast.error("Please choose a future date and time"); return; }
    setMeetLoading(true);
    try {
      const result = await aiSalesApi.inviteToMeeting(meetDialog.id, {
        agentId: meetAgentId,
        scheduledAt: new Date(meetDate).toISOString(),
        subject: meetSubject || undefined,
        message: meetMessage || undefined,
      });
      toast.success(`Meeting invite sent! Room: ${(result as any).data?.roomUrl || "created"}`);
      setMeetDialog(null);
      setMeetAgentId("");
      setMeetDate("");
      setMeetSubject("");
      setMeetMessage("");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to invite to meeting";
      toast.error(msg);
    }
    setMeetLoading(false);
  };

  const handleSuggestAction = async (leadId: string) => {
    setStrategyLoading(true);
    setStrategy(null);
    try {
      const res = await aiSalesApi.suggestAction(leadId);
      setStrategy((res as any).data);
    } catch { toast.error("Failed to get AI suggestion"); }
    setStrategyLoading(false);
  };

  const [autoExecLoading, setAutoExecLoading] = useState(false);
  const handleAutoExecute = async (leadId: string) => {
    setAutoExecLoading(true);
    try {
      const res = await aiSalesApi.autoExecuteStrategy(leadId);
      const data = (res as any).data;
      if (data.executed) {
        toast.success(`✅ ${data.action}: ${data.details}`);
        fetchLeads();
      } else {
        toast.info(`⏸ ${data.action}: ${data.details}`);
      }
    } catch { toast.error("Auto-execute failed"); }
    setAutoExecLoading(false);
  };

  const [pipelineLoading, setPipelineLoading] = useState(false);
  const handleRunPipeline = async (leadId: string) => {
    setPipelineLoading(true);
    try {
      const res = await aiSalesApi.runPipeline(leadId);
      const data = (res as any).data;
      toast.success(`Pipeline complete — Score: ${data.lead?.score}, Stage: ${data.lead?.stage}`);
      fetchLeads();
    } catch { toast.error("Pipeline failed"); }
    setPipelineLoading(false);
  };

  const handleJoinExternalMeet = async () => {
    if (!joinMeetDialog || !joinMeetUrl || !joinMeetAgentId) { toast.error("Fill all fields"); return; }
    setJoinMeetLoading(true);
    try {
      await aiSalesApi.joinExternalMeeting(joinMeetDialog.id, {
        meetUrl: joinMeetUrl,
        agentId: joinMeetAgentId,
      });
      toast.success("AI agent is joining the meeting!");
      setJoinMeetDialog(null);
      setJoinMeetUrl("");
      setJoinMeetAgentId("");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to join meeting";
      toast.error(msg);
    }
    setJoinMeetLoading(false);
  };

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
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
            <p className="text-[10px] text-muted-foreground mt-0.5">Must include country code, e.g. +91 98765 43210</p>
          </div>
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
                  {lead.nextCallStrategy && <p className="text-[10px] text-amber-600 truncate max-w-[200px]" title={lead.nextCallStrategy}>🎯 {lead.nextCallStrategy}</p>}
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
                    <Button
                      variant="ghost" size="sm"
                      className={`h-7 text-xs ${lead.phone ? "text-green-600" : "text-muted-foreground opacity-40 cursor-not-allowed"}`}
                      disabled={!lead.phone}
                      title={lead.phone ? `Call ${lead.phone}` : "No phone number on record"}
                      onClick={(e) => { e.stopPropagation(); if (lead.phone) setCallDialog(lead); }}
                    >
                      <Phone className="h-3 w-3 mr-1" />Call
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className={`h-7 text-xs ${lead.email ? "text-blue-600" : "text-muted-foreground opacity-40 cursor-not-allowed"}`}
                      disabled={!lead.email}
                      title={lead.email ? `Email ${lead.email}` : "No email address on record"}
                      onClick={(e) => { e.stopPropagation(); if (lead.email) setEmailDialog(lead); }}
                    >
                      <Mail className="h-3 w-3 mr-1" />Email
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className={`h-7 text-xs ${lead.email ? "text-purple-600" : "text-muted-foreground opacity-40 cursor-not-allowed"}`}
                      disabled={!lead.email}
                      title={lead.email ? "Invite to branded Orivraa meeting" : "No email — needed to send invite"}
                      onClick={(e) => { e.stopPropagation(); if (lead.email) setMeetDialog(lead); }}
                    >
                      <Video className="h-3 w-3 mr-1" />Invite
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
              <TabsList className="grid w-full grid-cols-8">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs" onClick={() => loadTimeline(selectedLead.id)}>
                  <Activity className="h-3 w-3 mr-1" />Timeline
                </TabsTrigger>
                <TabsTrigger value="personality" className="text-xs">Personality</TabsTrigger>
                <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
                <TabsTrigger value="buying" className="text-xs">Buying</TabsTrigger>
                <TabsTrigger value="ai-notes" className="text-xs">AI Notes</TabsTrigger>
                <TabsTrigger value="emails" className="text-xs" onClick={() => loadLeadEmails(selectedLead.id)}>
                  <Mail className="h-3 w-3 mr-1" />Emails
                </TabsTrigger>
                <TabsTrigger value="call-history" className="text-xs" onClick={() => loadCallRemarks(selectedLead.id)}>Calls</TabsTrigger>
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Quick Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm" variant="outline"
                    className={selectedLead.phone ? "text-green-600" : "text-muted-foreground opacity-50 cursor-not-allowed"}
                    disabled={!selectedLead.phone}
                    title={selectedLead.phone ? `Call ${selectedLead.phone}` : "No phone number — add one to enable calling"}
                    onClick={() => { if (selectedLead.phone) setCallDialog(selectedLead); }}
                  >
                    <Phone className="h-3 w-3 mr-1" />Call via AI
                    {!selectedLead.phone && <span className="ml-1 text-[10px]">(no phone)</span>}
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    className={selectedLead.email ? "text-blue-600" : "text-muted-foreground opacity-50 cursor-not-allowed"}
                    disabled={!selectedLead.email}
                    title={selectedLead.email ? `Email ${selectedLead.email}` : "No email address — add one to enable emailing"}
                    onClick={() => { if (selectedLead.email) setEmailDialog(selectedLead); }}
                  >
                    <Mail className="h-3 w-3 mr-1" />Send Email
                    {!selectedLead.email && <span className="ml-1 text-[10px]">(no email)</span>}
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    className={selectedLead.email ? "text-purple-600" : "text-muted-foreground opacity-50 cursor-not-allowed"}
                    disabled={!selectedLead.email}
                    title={selectedLead.email ? "Invite to branded Orivraa meeting" : "No email — needed to send invite"}
                    onClick={() => { if (selectedLead.email) setMeetDialog(selectedLead); }}
                  >
                    <Video className="h-3 w-3 mr-1" />Invite to Meeting
                    {!selectedLead.email && <span className="ml-1 text-[10px]">(no email)</span>}
                  </Button>
                  <Button
                    size="sm" variant="outline" className="text-indigo-600"
                    title="AI agent joins a Google Meet / Zoom link"
                    onClick={() => setJoinMeetDialog(selectedLead)}
                  >
                    <Video className="h-3 w-3 mr-1" />Join Meet
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { loadScore(selectedLead.id); }}>
                    <Target className="h-3 w-3 mr-1" />Score
                  </Button>
                  <Button
                    size="sm" variant="outline" className="text-amber-600"
                    disabled={strategyLoading}
                    onClick={() => handleSuggestAction(selectedLead.id)}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />{strategyLoading ? "Thinking..." : "AI Suggest"}
                  </Button>
                  <Button
                    size="sm" variant="default" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                    disabled={autoExecLoading}
                    onClick={() => handleAutoExecute(selectedLead.id)}
                  >
                    <Zap className="h-3 w-3 mr-1" />{autoExecLoading ? "Executing..." : "Auto Execute"}
                  </Button>
                  <Button
                    size="sm" variant="outline" className="text-blue-600"
                    disabled={pipelineLoading}
                    onClick={() => handleRunPipeline(selectedLead.id)}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${pipelineLoading ? "animate-spin" : ""}`} />{pipelineLoading ? "Processing..." : "Re-Score"}
                  </Button>
                </div>

                {/* AI Strategy Recommendation */}
                {strategy && (
                  <Card className="border-amber-200 bg-amber-50/50">
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Sparkles className="h-4 w-4 text-amber-500" />AI Recommendation</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={strategy.priority === "high" ? "destructive" : strategy.priority === "medium" ? "warning" : "secondary"}>
                          {strategy.priority}
                        </Badge>
                        <Badge variant="outline">{strategy.action?.replace(/_/g, " ")}</Badge>
                      </div>
                      <p className="text-muted-foreground">{strategy.reason}</p>
                      {strategy.suggestedGoal && <p><strong>Goal:</strong> {strategy.suggestedGoal}</p>}
                      {strategy.suggestedMessage && (
                        <div className="bg-white p-2 rounded border text-xs">
                          <p className="text-muted-foreground mb-1">Suggested message:</p>
                          <p>{strategy.suggestedMessage}</p>
                        </div>
                      )}
                      {strategy.action === "INVITE_MEETING" && (
                        <Button size="sm" className="mt-2" onClick={() => { setMeetDialog(selectedLead); if (strategy.meetingSubject) setMeetSubject(strategy.meetingSubject); }}>
                          <Video className="h-3 w-3 mr-1" />Create Meeting Invite
                        </Button>
                      )}
                      {strategy.action === "CALL" && selectedLead.phone && (
                        <Button size="sm" className="mt-2" onClick={() => { setCallDialog(selectedLead); }}>
                          <Phone className="h-3 w-3 mr-1" />Call Now
                        </Button>
                      )}
                      {strategy.action === "EMAIL" && selectedLead.email && (
                        <Button size="sm" className="mt-2" onClick={() => { setEmailDialog(selectedLead); }}>
                          <Mail className="h-3 w-3 mr-1" />Compose Email
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-muted-foreground">Email</p><p>{selectedLead.email || "—"}</p></div>
                  <div><p className="text-muted-foreground">Phone</p><p>{selectedLead.phone || "—"}</p></div>
                  <div><p className="text-muted-foreground">Company</p><p>{selectedLead.company || "—"}</p></div>
                  <div><p className="text-muted-foreground">Role</p><p>{selectedLead.role || "—"}</p></div>
                  <div><p className="text-muted-foreground">Stage</p>
                    <Badge variant={
                      selectedLead.stage === "WON" ? "success" :
                      selectedLead.stage === "LOST" ? "destructive" :
                      selectedLead.stage === "NEGOTIATION" || selectedLead.stage === "PROPOSAL" ? "warning" :
                      "secondary"
                    }>{selectedLead.stage}</Badge>
                  </div>
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

                {/* Buying Intelligence & Enrichment */}
                {(selectedLead.budgetRange || selectedLead.urgency || selectedLead.communicationStyle || selectedLead.predictedConcern || selectedLead.dealValue) && (
                  <Card className="border-blue-200">
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Target className="h-4 w-4 text-blue-500" />Buying Intelligence</CardTitle></CardHeader>
                    <CardContent className="text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        {selectedLead.budgetRange && <div><p className="text-muted-foreground">Budget</p><p className="font-medium">{selectedLead.budgetRange}</p></div>}
                        {selectedLead.urgency && <div><p className="text-muted-foreground">Urgency</p><Badge variant={selectedLead.urgency === "high" || selectedLead.urgency === "urgent" ? "destructive" : "secondary"}>{selectedLead.urgency}</Badge></div>}
                        {selectedLead.communicationStyle && <div><p className="text-muted-foreground">Comm Style</p><p className="font-medium capitalize">{selectedLead.communicationStyle}</p></div>}
                        {selectedLead.decisionStyle && <div><p className="text-muted-foreground">Decision Style</p><p className="font-medium capitalize">{selectedLead.decisionStyle}</p></div>}
                        {selectedLead.dealValue && <div><p className="text-muted-foreground">Deal Value</p><p className="font-medium">₹{selectedLead.dealValue.toLocaleString()}</p></div>}
                        {selectedLead.predictedConcern && <div className="col-span-2"><p className="text-muted-foreground">Predicted Concern</p><p className="bg-red-50 dark:bg-red-950/20 rounded p-1">{selectedLead.predictedConcern}</p></div>}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Timeline */}
              <TabsContent value="timeline" className="space-y-4 mt-4">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Activity className="h-4 w-4 text-indigo-500" />
                  Interaction Timeline
                </div>
                {timelineLoading ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Loading timeline...</p>
                ) : timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No interactions yet — calls, emails, and meets will appear here.</p>
                ) : (
                  <div className="space-y-3">
                    {timeline.map((item: any) => {
                      const iconMap: Record<string, any> = {
                        CALL: <Phone className="h-3.5 w-3.5 text-green-500" />,
                        EMAIL_SENT: <Send className="h-3.5 w-3.5 text-blue-500" />,
                        EMAIL_RECEIVED: <Mail className="h-3.5 w-3.5 text-cyan-500" />,
                        GMEET: <Video className="h-3.5 w-3.5 text-purple-500" />,
                        FOLLOW_UP: <CalendarPlus className="h-3.5 w-3.5 text-orange-500" />,
                        NOTE: <MessageSquare className="h-3.5 w-3.5 text-gray-500" />,
                      };
                      const colorMap: Record<string, string> = {
                        CALL: "border-l-green-500",
                        EMAIL_SENT: "border-l-blue-500",
                        EMAIL_RECEIVED: "border-l-cyan-500",
                        GMEET: "border-l-purple-500",
                        FOLLOW_UP: "border-l-orange-500",
                        NOTE: "border-l-gray-500",
                      };
                      return (
                        <Card key={item.id} className={`border-l-4 ${colorMap[item.type] || "border-l-gray-300"}`}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                {iconMap[item.type] || <Activity className="h-3.5 w-3.5" />}
                                <Badge variant="outline" className="text-xs">{(item.type || "").replace(/_/g, " ")}</Badge>
                                {item.channel && <span className="text-[10px] text-muted-foreground">via {item.channel}</span>}
                              </div>
                              <span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span>
                            </div>
                            {item.summary && <p className="text-sm mt-1">{item.summary}</p>}
                            {item.goalSet && (
                              <div className="flex items-center gap-1 mt-1 text-xs">
                                <Target className="h-3 w-3" />
                                <span className="text-muted-foreground">Goal: {item.goalSet}</span>
                                {item.goalAchieved === true && <CheckCircle2 className="h-3 w-3 text-green-500 ml-1" />}
                                {item.goalAchieved === false && <XCircle className="h-3 w-3 text-red-500 ml-1" />}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
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

              {/* Emails Tab */}
              <TabsContent value="emails" className="space-y-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Mail className="h-4 w-4 text-blue-500" />
                    Email History
                  </div>
                  <Button
                    size="sm" variant="outline"
                    disabled={!selectedLead.email}
                    title={selectedLead.email ? "Compose email" : "No email address on record"}
                    onClick={() => { if (selectedLead.email) setEmailDialog(selectedLead); }}
                  >
                    <Send className="h-3 w-3 mr-1" />Compose
                  </Button>
                </div>
                {!selectedLead.email && (
                  <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded p-2">
                    ⚠️ No email address for this lead. Add one in Edit to enable emailing.
                  </p>
                )}
                {emailsLoading ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Loading emails...</p>
                ) : leadEmails.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No emails yet — send the first one above.</p>
                ) : (
                  <div className="space-y-3">
                    {leadEmails.map((em: any) => (
                      <Card key={em.id} className={`border-l-4 ${em.direction === "SENT" ? "border-l-blue-500" : "border-l-cyan-500"}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={em.direction === "SENT" ? "default" : "secondary"} className="text-xs">
                                {em.direction === "SENT" ? "Sent" : "Received"}
                              </Badge>
                              {em.aiGenerated && <Badge variant="outline" className="text-xs text-purple-600">AI</Badge>}
                              {em.meetScheduledAt && <Badge variant="outline" className="text-xs text-green-600"><Video className="h-2.5 w-2.5 mr-0.5" />Meet</Badge>}
                            </div>
                            <span className="text-xs text-muted-foreground">{new Date(em.sentAt || em.receivedAt || em.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-sm font-medium">{em.subject}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{em.body}</p>
                        </CardContent>
                      </Card>
                    ))}
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

      <Dialog open={!!callDialog} onOpenChange={(open) => { if (!open) { setCallDialog(null); setCallGoal(""); setCallAgentId(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Call {callDialog?.name} via AI</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {!callDialog?.phone && (
              <div className="text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-3">
                ⚠️ <strong>No phone number on record.</strong> Add a phone number in Edit before calling.
              </div>
            )}
            {callDialog?.phone && !/^\+[1-9]\d{6,14}$/.test(callDialog.phone.trim()) && (
              <div className="text-sm text-red-700 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-3">
                ⚠️ <strong>Invalid phone format.</strong> Phone must be in E.164 format (e.g. <code>+919876543210</code>). Edit the lead to fix it.
              </div>
            )}
            {agents.length === 0 && (
              <div className="text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-3">
                ⚠️ <strong>No AI agents configured.</strong> <a href="/ai-sales/personas" className="underline">Create an agent</a> first.
              </div>
            )}
            <div>
              <Label>AI Agent</Label>
              <Select value={callAgentId} onValueChange={setCallAgentId}>
                <SelectTrigger><SelectValue placeholder={agents.length === 0 ? "No agents available" : "Select agent"} /></SelectTrigger>
                <SelectContent>
                  {agents.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Call Goal (optional)</Label>
              <Textarea
                value={callGoal}
                onChange={(e) => setCallGoal(e.target.value)}
                placeholder="e.g., Schedule a demo, Confirm pricing interest, Follow up on last conversation..."
                rows={3}
              />
              <p className="text-[10px] text-muted-foreground mt-1">AI will evaluate if this goal was achieved after the call</p>
            </div>
            {callDialog?.phone && (
              <p className="text-sm text-muted-foreground">Calling: <span className="font-mono">{callDialog.phone}</span></p>
            )}
            <Button
              onClick={handleCallFromLead}
              disabled={
                callLoading ||
                !callDialog?.phone ||
                agents.length === 0 ||
                !callAgentId ||
                (callDialog?.phone && !/^\+[1-9]\d{6,14}$/.test(callDialog.phone.trim()))
              }
              className="w-full"
            >
              <Phone className="h-4 w-4 mr-2" />{callLoading ? "Initiating..." : "Start AI Call"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog open={!!emailDialog} onOpenChange={(open) => { if (!open) { setEmailDialog(null); setEmailSubject(""); setEmailBody(""); setEmailGoal(""); setEmailIncludeMeet(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Email {emailDialog?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {!emailDialog?.email && (
              <div className="text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-3">
                ⚠️ <strong>No email address on record.</strong> Add one in Edit before sending.
              </div>
            )}
            {emailDialog?.email && (
              <p className="text-xs text-muted-foreground">To: <span className="font-medium">{emailDialog.email}</span></p>
            )}
            <div>
              <Label>Email Goal (for AI context)</Label>
              <Input value={emailGoal} onChange={(e) => setEmailGoal(e.target.value)} placeholder="e.g., Schedule a follow-up meeting" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="includeMeet" checked={emailIncludeMeet} onChange={(e) => setEmailIncludeMeet(e.target.checked)} className="rounded" />
              <Label htmlFor="includeMeet" className="text-sm cursor-pointer">Include Google Meet link</Label>
            </div>
            <Button variant="outline" size="sm" onClick={handleGenerateDraft} disabled={emailLoading || !emailDialog?.email}>
              <Brain className="h-3 w-3 mr-1" />{emailLoading ? "Generating..." : "AI Draft"}
            </Button>
            <div>
              <Label>Subject</Label>
              <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Email subject" />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="Email body..." rows={6} />
            </div>
            <Button onClick={handleSendEmail} disabled={emailLoading || !emailDialog?.email} className="w-full">
              <Send className="h-4 w-4 mr-2" />{emailLoading ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite to Branded Meeting Dialog */}
      <Dialog open={!!meetDialog} onOpenChange={(open) => { if (!open) { setMeetDialog(null); setMeetAgentId(""); setMeetDate(""); setMeetSubject(""); setMeetMessage(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Invite {meetDialog?.name} to Orivraa Meeting</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {!meetDialog?.email && (
              <div className="text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-3">
                ⚠️ <strong>No email address on record.</strong> An email is required to send the invite.
              </div>
            )}
            {meetDialog?.email && (
              <p className="text-xs text-muted-foreground">Branded meeting invite will be sent to: <span className="font-medium">{meetDialog.email}</span></p>
            )}
            {agents.length === 0 && (
              <div className="text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-3">
                ⚠️ No AI agents configured. <a href="/ai-sales/personas" className="underline">Create one first.</a>
              </div>
            )}
            <div>
              <Label>AI Agent</Label>
              <Select value={meetAgentId} onValueChange={setMeetAgentId}>
                <SelectTrigger><SelectValue placeholder={agents.length === 0 ? "No agents available" : "Select agent"} /></SelectTrigger>
                <SelectContent>
                  {agents.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={meetDate}
                min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                onChange={(e) => setMeetDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Subject (optional)</Label>
              <Input value={meetSubject} onChange={(e) => setMeetSubject(e.target.value)} placeholder="Product demo, Follow-up discussion..." />
            </div>
            <div>
              <Label>Personal Message (optional)</Label>
              <Textarea value={meetMessage} onChange={(e) => setMeetMessage(e.target.value)} placeholder="Custom message for the invite email..." rows={3} />
            </div>
            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-2 rounded">
              💡 This creates a <strong>branded Orivraa video room</strong> with AI agent ready. The lead will receive an email invite with the meeting link.
            </div>
            <Button onClick={handleScheduleMeet} disabled={meetLoading || !meetDialog?.email || !meetAgentId || !meetDate} className="w-full">
              <Video className="h-4 w-4 mr-2" />{meetLoading ? "Sending Invite..." : "Send Meeting Invite"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join External Meeting Dialog */}
      <Dialog open={!!joinMeetDialog} onOpenChange={(open) => { if (!open) { setJoinMeetDialog(null); setJoinMeetUrl(""); setJoinMeetAgentId(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Join {joinMeetDialog?.name}&apos;s Meeting</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Meeting URL</Label>
              <Input value={joinMeetUrl} onChange={(e) => setJoinMeetUrl(e.target.value)} placeholder="https://meet.google.com/xxx-yyyy-zzz" />
              <p className="text-xs text-muted-foreground mt-1">Supports Google Meet, Zoom, and Teams links</p>
            </div>
            <div>
              <Label>AI Agent</Label>
              <Select value={joinMeetAgentId} onValueChange={setJoinMeetAgentId}>
                <SelectTrigger><SelectValue placeholder="Select agent to join meeting" /></SelectTrigger>
                <SelectContent>
                  {agents.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground bg-indigo-50 dark:bg-indigo-950/30 p-2 rounded">
              🤖 The AI agent will join the meeting, listen, speak, and save the transcript automatically.
            </div>
            <Button onClick={handleJoinExternalMeet} disabled={joinMeetLoading || !joinMeetUrl || !joinMeetAgentId} className="w-full">
              <Video className="h-4 w-4 mr-2" />{joinMeetLoading ? "Joining..." : "Join Meeting"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
