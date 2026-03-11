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
import { Bot, Plus, Power, Pencil, ArrowLeft, Variable } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const LANGUAGES = ["en", "hi", "ta", "te", "ml", "kn", "bn", "gu", "mr", "pa"];
const PERSONALITIES = [
  "Professional & Warm",
  "Casual & Friendly",
  "Consultative & Expert",
  "Energetic & Enthusiastic",
  "Calm & Patient",
];

/**
 * Template variables available for greeting and script content.
 * Grouped by category for easy browsing.
 */
const TEMPLATE_VARIABLES = [
  { group: "Lead Info", vars: [
    { token: "{{lead_name}}", label: "Lead Name", desc: "Full name of the lead" },
    { token: "{{lead_preferred_name}}", label: "Preferred Name", desc: "Name they prefer to be called" },
    { token: "{{lead_company}}", label: "Company", desc: "Lead's company name" },
    { token: "{{lead_role}}", label: "Role", desc: "Job title / role" },
    { token: "{{lead_city}}", label: "City", desc: "Lead's city" },
    { token: "{{lead_country}}", label: "Country", desc: "Country code" },
  ]},
  { group: "Agent Info", vars: [
    { token: "{{agent_name}}", label: "Agent Name", desc: "AI agent's name" },
    { token: "{{agent_personality}}", label: "Personality", desc: "Agent personality style" },
    { token: "{{company_name}}", label: "Company Name", desc: "Your company name (from memory)" },
  ]},
  { group: "Context", vars: [
    { token: "{{current_time}}", label: "Time of Day", desc: "Good morning/afternoon/evening" },
    { token: "{{call_number}}", label: "Call Number", desc: "Which call this is (1st, 2nd...)" },
    { token: "{{last_call_summary}}", label: "Last Call Summary", desc: "AI summary of previous call" },
    { token: "{{product_name}}", label: "Product Name", desc: "Product being discussed" },
    { token: "{{deal_value}}", label: "Deal Value", desc: "Estimated deal value" },
  ]},
  { group: "Personalization", vars: [
    { token: "{{lead_hobby}}", label: "Hobby", desc: "Lead's hobbies" },
    { token: "{{open_loops}}", label: "Open Loops", desc: "Unresolved topics from last call" },
    { token: "{{preferred_language}}", label: "Language", desc: "Lead's preferred language" },
  ]},
];

/**
 * TemplateEditor — a textarea with a variable insertion toolbar
 */
function TemplateEditor({
  value,
  onChange,
  placeholder,
  rows = 3,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  label: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showVars, setShowVars] = useState(false);

  const insertVariable = useCallback((token: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      onChange(value + token);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newVal = value.substring(0, start) + token + value.substring(end);
    onChange(newVal);
    // restore cursor after variable
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + token.length;
      ta.setSelectionRange(pos, pos);
    });
  }, [value, onChange]);

  // Highlight preview — show variable tokens in a different style
  const preview = value
    ? value.replace(/\{\{[a-z_]+\}\}/g, (m) => `[${m}]`)
    : "";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => setShowVars(!showVars)}
        >
          <Variable className="h-3.5 w-3.5" />
          {showVars ? "Hide Variables" : "Insert Variable"}
        </Button>
      </div>

      {showVars && (
        <div className="border rounded-lg p-3 bg-muted/30 space-y-3 max-h-56 overflow-y-auto">
          {TEMPLATE_VARIABLES.map((group) => (
            <div key={group.group}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                {group.group}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.vars.map((v) => (
                  <button
                    key={v.token}
                    type="button"
                    onClick={() => insertVariable(v.token)}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors group"
                    title={v.desc}
                  >
                    <span className="font-mono text-blue-600 dark:text-blue-400 text-[10px]">
                      {v.token}
                    </span>
                    <span className="text-muted-foreground group-hover:text-foreground">
                      {v.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="font-mono text-sm"
      />

      {value && /\{\{[a-z_]+\}\}/.test(value) && (
        <p className="text-[11px] text-muted-foreground">
          <span className="font-medium">Preview: </span>
          {preview}
        </p>
      )}
    </div>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editAgent, setEditAgent] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    voiceId: "",
    language: "en",
    personality: "Professional & Warm",
    greeting: "",
    description: "",
  });

  const load = () => {
    setLoading(true);
    aiSalesApi.listAgents().then((res) => {
      setAgents(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ name: "", voiceId: "", language: "en", personality: "Professional & Warm", greeting: "", description: "" });
  };

  const handleCreate = async () => {
    try {
      await aiSalesApi.createAgent(form);
      toast.success("Agent created");
      setShowCreate(false);
      resetForm();
      load();
    } catch { toast.error("Failed to create agent"); }
  };

  const handleUpdate = async () => {
    if (!editAgent) return;
    try {
      await aiSalesApi.updateAgent(editAgent.id, form);
      toast.success("Agent updated");
      setEditAgent(null);
      resetForm();
      load();
    } catch { toast.error("Failed to update agent"); }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await aiSalesApi.toggleAgent(id, !isActive);
      load();
    } catch { toast.error("Failed to toggle agent"); }
  };

  const openEdit = (agent: any) => {
    setForm({
      name: agent.name,
      voiceId: agent.voiceId || "",
      language: agent.language || "en",
      personality: agent.personality || "Professional & Warm",
      greeting: agent.greeting || "",
      description: agent.description || "",
    });
    setEditAgent(agent);
  };

  const formFields = (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Agent Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Luna" />
        </div>
        <div>
          <Label>Voice ID (ElevenLabs)</Label>
          <Input value={form.voiceId} onChange={(e) => setForm({ ...form, voiceId: e.target.value })} placeholder="e.g. 21m00Tcm4TlvDq8ikWAM" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Language</Label>
          <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l.toUpperCase()}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Personality</Label>
          <Select value={form.personality} onValueChange={(v) => setForm({ ...form, personality: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERSONALITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <TemplateEditor
        label="Greeting"
        value={form.greeting}
        onChange={(v) => setForm({ ...form, greeting: v })}
        placeholder="Hi {{lead_name}}, this is {{agent_name}} from {{company_name}}..."
        rows={3}
      />

      <div>
        <Label>Description</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Internal description of this agent's purpose..." rows={2} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ai-sales"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Agents</h1>
            <p className="text-muted-foreground">Configure AI sales agents with voice, personality, and scripts</p>
          </div>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}><Plus className="mr-2 h-4 w-4" />Create Agent</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create AI Agent</DialogTitle></DialogHeader>
            {formFields}
            <Button onClick={handleCreate} className="w-full">Create Agent</Button>
          </DialogContent>
        </Dialog>
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">No AI Agents Yet</h3>
            <p className="text-muted-foreground mb-4">Create your first AI sales agent to get started</p>
            <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" />Create Agent</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent: any) => (
            <Card key={agent.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${agent.isActive ? "bg-emerald-500" : "bg-gray-300"}`} />
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                  </div>
                  <Badge variant={agent.isActive ? "success" : "secondary"}>
                    {agent.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {agent.description && <p className="text-sm text-muted-foreground">{agent.description}</p>}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground">Language</p>
                    <p className="font-medium">{(agent.language || "en").toUpperCase()}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground">Calls</p>
                    <p className="font-medium">{agent._count?.callSessions ?? 0}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2 col-span-2">
                    <p className="text-muted-foreground">Personality</p>
                    <p className="font-medium">{agent.personality || "Default"}</p>
                  </div>
                </div>
                {agent.greeting && (
                  <div className="text-xs bg-blue-50 dark:bg-blue-950/30 rounded p-2">
                    <p className="text-muted-foreground mb-1">Greeting</p>
                    <p className="italic">&ldquo;{agent.greeting.substring(0, 100)}...&rdquo;</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(agent)}>
                    <Pencil className="mr-1 h-3 w-3" />Edit
                  </Button>
                  <Button
                    variant={agent.isActive ? "destructive" : "default"}
                    size="sm"
                    className="flex-1"
                    onClick={() => handleToggle(agent.id, agent.isActive)}
                  >
                    <Power className="mr-1 h-3 w-3" />{agent.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editAgent} onOpenChange={(open) => { if (!open) setEditAgent(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Agent: {editAgent?.name}</DialogTitle></DialogHeader>
          {formFields}
          <Button onClick={handleUpdate} className="w-full">Save Changes</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
