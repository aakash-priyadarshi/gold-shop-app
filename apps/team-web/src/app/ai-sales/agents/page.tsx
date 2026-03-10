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
import { Bot, Plus, Power, Pencil, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const LANGUAGES = ["en", "hi", "ta", "te", "ml", "kn", "bn", "gu", "mr", "pa"];
const PERSONALITIES = [
  "Professional & Warm",
  "Casual & Friendly",
  "Consultative & Expert",
  "Energetic & Enthusiastic",
  "Calm & Patient",
];

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
      <div>
        <Label>Greeting</Label>
        <Textarea value={form.greeting} onChange={(e) => setForm({ ...form, greeting: e.target.value })} placeholder="Hi {{lead_name}}, this is {{agent_name}} from..." rows={2} />
      </div>
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
