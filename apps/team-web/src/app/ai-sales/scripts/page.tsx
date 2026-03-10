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
import { ArrowLeft, Copy, FileText, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const TEMPLATE_VARS = [
  { var: "{{lead_name}}", desc: "Lead's full name" },
  { var: "{{company}}", desc: "Lead's company" },
  { var: "{{product}}", desc: "Product name" },
  { var: "{{agent_name}}", desc: "Agent's name" },
  { var: "{{pain_point}}", desc: "Known pain point" },
  { var: "{{industry}}", desc: "Lead's industry" },
];

const CATEGORIES = [
  "greeting", "discovery", "pitch", "objection_handling", "closing", "follow_up", "voicemail",
];

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editScript, setEditScript] = useState<any>(null);
  const [form, setForm] = useState({ name: "", content: "", category: "greeting" });

  const load = () => {
    setLoading(true);
    aiSalesApi
      .listScripts()
      .then((r) => {
        const d = r.data;
        setScripts(Array.isArray(d) ? d : d?.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ name: "", content: "", category: "greeting" });

  const handleCreate = async () => {
    if (!form.name.trim() || !form.content.trim()) return;
    await aiSalesApi.createScript({ name: form.name, content: form.content, category: form.category });
    setCreateOpen(false);
    resetForm();
    load();
  };

  const handleUpdate = async () => {
    if (!editScript) return;
    await aiSalesApi.updateScript(editScript.id, { name: form.name, content: form.content, category: form.category });
    setEditScript(null);
    resetForm();
    load();
  };

  const handleDelete = async (id: string) => {
    await aiSalesApi.deleteScript(id);
    load();
  };

  const openEdit = (script: any) => {
    setForm({ name: script.name, content: script.content, category: script.category || "greeting" });
    setEditScript(script);
  };

  const insertVar = (v: string) => {
    setForm((prev) => ({ ...prev, content: prev.content + v }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ai-sales"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Scripts</h1>
            <p className="text-muted-foreground">Manage conversation scripts with template variables</p>
          </div>
        </div>

        <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Script</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Create Script</DialogTitle></DialogHeader>
            <ScriptForm form={form} setForm={setForm} insertVar={insertVar} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!form.name.trim() || !form.content.trim()}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Template Variables Reference */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Available Template Variables</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_VARS.map((tv) => (
              <Badge key={tv.var} variant="outline" className="cursor-help text-xs" title={tv.desc}>
                {tv.var}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scripts Grid */}
      {loading ? (
        <div className="text-center p-12 text-muted-foreground">Loading scripts...</div>
      ) : scripts.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No scripts yet</p>
          <p className="text-sm text-muted-foreground mb-4">Create your first conversation script</p>
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Script</Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {scripts.map((s: any) => (
            <Card key={s.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm">{s.name}</CardTitle>
                    <Badge variant="outline" className="text-[10px] mt-1">{s.category || "general"}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(s.content); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{s.content}</p>
                <Button variant="link" size="sm" className="mt-2 px-0 text-xs" onClick={() => openEdit(s)}>Edit Script</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editScript} onOpenChange={(o) => { if (!o) { setEditScript(null); resetForm(); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Edit Script</DialogTitle></DialogHeader>
          <ScriptForm form={form} setForm={setForm} insertVar={insertVar} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setEditScript(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={!form.name.trim() || !form.content.trim()}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScriptForm({
  form,
  setForm,
  insertVar,
}: {
  form: { name: string; content: string; category: string };
  setForm: React.Dispatch<React.SetStateAction<{ name: string; content: string; category: string }>>;
  insertVar: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Cold Call Opener" />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Content</Label>
          <span className="text-[10px] text-muted-foreground">Click a variable to insert it</span>
        </div>
        <Textarea
          value={form.content}
          onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
          placeholder="Hi {{lead_name}}, this is {{agent_name}} from..."
          rows={8}
          className="font-mono text-sm"
        />
        <div className="flex flex-wrap gap-1">
          {TEMPLATE_VARS.map((tv) => (
            <Button key={tv.var} variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => insertVar(tv.var)}>
              {tv.var}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
