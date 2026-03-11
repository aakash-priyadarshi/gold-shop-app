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
import {
  ArrowLeft, Mic, Pencil, Plus, Power, Star, Trash2, User,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/* ─── Constants ─── */

const SPECIALITIES = [
  { value: "rapport", label: "Rapport & Relationship" },
  { value: "technical", label: "Technical & Data-driven" },
  { value: "closing", label: "Closing & Negotiation" },
  { value: "enterprise", label: "Enterprise & Formal" },
  { value: "retention", label: "Retention & Recovery" },
];

const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

const ACCENTS = [
  "Neutral", "Indian", "American", "British", "Australian", "Middle Eastern",
];

const LANGUAGE_OPTIONS = [
  { code: "en-IN", label: "English (India)" },
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "hi-IN", label: "Hindi" },
  { code: "ta-IN", label: "Tamil" },
  { code: "te-IN", label: "Telugu" },
  { code: "kn-IN", label: "Kannada" },
  { code: "ml-IN", label: "Malayalam" },
  { code: "bn-IN", label: "Bengali" },
  { code: "mr-IN", label: "Marathi" },
  { code: "gu-IN", label: "Gujarati" },
  { code: "pa-IN", label: "Punjabi" },
  { code: "ar", label: "Arabic" },
  { code: "de", label: "German" },
];

const GREETING_VARIABLES = [
  { variable: "{{lead_name}}", label: "Lead Name", description: "Customer's name" },
  { variable: "{{agent_name}}", label: "Agent Name", description: "AI agent's name" },
  { variable: "{{company_name}}", label: "Company", description: "Your company name" },
  { variable: "{{current_time}}", label: "Time", description: "Current time of day" },
];

/* ─── Empty form shape ─── */

const EMPTY_FORM = {
  name: "",
  voiceId: "",
  languages: "",       // comma-separated, converted to array on save
  gender: "",
  accent: "",
  isDefault: false,
  isActive: true,
  description: "",
  greeting: "",
  personalityDescription: "",
  speciality: "",
  backstory: "",
  age: "",
  signaturePhrases: "",  // comma-separated
  bannedPhrases: "",     // comma-separated
  handoffIntro: "",
  handoffOutro: "",
  systemPromptTemplate: "",
  voiceStability: "0.5",
  voiceSimilarityBoost: "0.75",
  voiceStyle: "0.0",
  voiceUseSpeakerBoost: true,
  targetSegments: "",    // comma-separated
};

/* ─── Helpers ─── */

function toArray(val: string): string[] {
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

function fromArray(arr: string[] | undefined | null): string {
  return (arr || []).join(", ");
}

function buildPayload(form: typeof EMPTY_FORM) {
  return {
    name: form.name,
    voiceId: form.voiceId,
    languages: toArray(form.languages),
    gender: form.gender || undefined,
    accent: form.accent || undefined,
    isDefault: form.isDefault,
    isActive: form.isActive,
    description: form.description || undefined,
    greeting: form.greeting || undefined,
    personalityDescription: form.personalityDescription || undefined,
    speciality: form.speciality || undefined,
    backstory: form.backstory || undefined,
    age: form.age || undefined,
    signaturePhrases: toArray(form.signaturePhrases),
    bannedPhrases: toArray(form.bannedPhrases),
    handoffIntro: form.handoffIntro || undefined,
    handoffOutro: form.handoffOutro || undefined,
    systemPromptTemplate: form.systemPromptTemplate || undefined,
    voiceStability: parseFloat(form.voiceStability) || 0.5,
    voiceSimilarityBoost: parseFloat(form.voiceSimilarityBoost) || 0.75,
    voiceStyle: parseFloat(form.voiceStyle) || 0.0,
    voiceUseSpeakerBoost: form.voiceUseSpeakerBoost,
    targetSegments: toArray(form.targetSegments),
  };
}

function personaToForm(p: any): typeof EMPTY_FORM {
  return {
    name: p.name || "",
    voiceId: p.voiceId || "",
    languages: fromArray(p.languages),
    gender: p.gender || "",
    accent: p.accent || "",
    isDefault: p.isDefault || false,
    isActive: p.isActive ?? true,
    description: p.description || "",
    greeting: p.greeting || "",
    personalityDescription: p.personalityDescription || "",
    speciality: p.speciality || "",
    backstory: p.backstory || "",
    age: p.age || "",
    signaturePhrases: fromArray(p.signaturePhrases),
    bannedPhrases: fromArray(p.bannedPhrases),
    handoffIntro: p.handoffIntro || "",
    handoffOutro: p.handoffOutro || "",
    systemPromptTemplate: p.systemPromptTemplate || "",
    voiceStability: String(p.voiceStability ?? 0.5),
    voiceSimilarityBoost: String(p.voiceSimilarityBoost ?? 0.75),
    voiceStyle: String(p.voiceStyle ?? 0.0),
    voiceUseSpeakerBoost: p.voiceUseSpeakerBoost ?? true,
    targetSegments: fromArray(p.targetSegments),
  };
}

/* ─── Component ─── */

export default function PersonasPage() {
  const [personas, setPersonas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const greetingRef = useRef<HTMLTextAreaElement>(null);
  const [activeTab, setActiveTab] = useState<"identity" | "personality" | "voice" | "behaviour" | "segments">("identity");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await aiSalesApi.listVoices();
      setPersonas(data);
    } catch {
      toast.error("Failed to load personas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setActiveTab("identity");
    setDialogOpen(true);
  };

  const openEdit = (p: any) => {
    setForm(personaToForm(p));
    setEditingId(p.id);
    setActiveTab("identity");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.voiceId) {
      toast.error("Name and Voice ID are required");
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload(form);
      if (editingId) {
        await aiSalesApi.updateVoice(editingId, payload);
        toast.success("Persona updated");
      } else {
        await aiSalesApi.createVoice(payload);
        toast.success("Persona created");
      }
      setDialogOpen(false);
      load();
    } catch {
      toast.error("Failed to save persona");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this persona?")) return;
    try {
      await aiSalesApi.deleteVoice(id);
      toast.success("Persona deleted");
      if (selectedId === id) setSelectedId(null);
      load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleSeed = async () => {
    try {
      const { data } = await aiSalesApi.seedVoices();
      if (data.seeded) {
        toast.success(`Seeded ${data.count} default personas`);
        load();
      } else {
        toast.info(data.message);
      }
    } catch {
      toast.error("Failed to seed defaults");
    }
  };

  const selected = personas.find((p) => p.id === selectedId);

  /* ─── Tab content for persona form ─── */

  const tabContent = () => {
    switch (activeTab) {
      case "identity":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Persona Name *</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Sarah, James, Priya" />
              </div>
              <div>
                <Label>Age</Label>
                <Input value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="e.g. 28" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Accent</Label>
                <Select value={form.accent} onValueChange={(v) => set("accent", v)}>
                  <SelectTrigger><SelectValue placeholder="Select accent" /></SelectTrigger>
                  <SelectContent>
                    {ACCENTS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Speciality</Label>
              <Select value={form.speciality} onValueChange={(v) => set("speciality", v)}>
                <SelectTrigger><SelectValue placeholder="Select speciality" /></SelectTrigger>
                <SelectContent>
                  {SPECIALITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Languages (comma-separated BCP-47 codes)</Label>
              <Input value={form.languages} onChange={(e) => set("languages", e.target.value)} placeholder="en-IN, hi-IN, ta-IN" />
              <div className="flex flex-wrap gap-1 mt-2">
                {LANGUAGE_OPTIONS.map((l) => (
                  <button key={l.code} type="button" className={`text-xs px-2 py-0.5 rounded border transition-colors ${form.languages.includes(l.code) ? "bg-blue-600 text-white border-blue-600" : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500"}`}
                    onClick={() => {
                      const current = toArray(form.languages);
                      const next = current.includes(l.code) ? current.filter((c) => c !== l.code) : [...current, l.code];
                      set("languages", next.join(", "));
                    }}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Backstory</Label>
              <Textarea value={form.backstory} onChange={(e) => set("backstory", e.target.value)} placeholder="Rich character backstory the AI reads before calls..." rows={4} />
            </div>
            <div>
              <Label>Description (internal)</Label>
              <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Internal description of this agent's purpose..." rows={2} />
            </div>
            <div>
              <Label>Greeting (opening line for calls)</Label>
              <Textarea ref={greetingRef} value={form.greeting} onChange={(e) => set("greeting", e.target.value)} placeholder="Hi {{lead_name}}, this is {{agent_name}} from {{company_name}}..." rows={3} />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {GREETING_VARIABLES.map((v) => (
                  <button
                    key={v.variable}
                    type="button"
                    title={v.description}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                      form.greeting.includes(v.variable)
                        ? "bg-amber-600/20 text-amber-400 border-amber-600/50"
                        : "bg-gray-800 text-gray-400 border-gray-700 hover:border-amber-600/50 hover:text-amber-400"
                    }`}
                    onClick={() => {
                      const el = greetingRef.current;
                      if (el) {
                        const start = el.selectionStart ?? form.greeting.length;
                        const end = el.selectionEnd ?? start;
                        const before = form.greeting.slice(0, start);
                        const after = form.greeting.slice(end);
                        const needsSpace = before.length > 0 && !before.endsWith(" ") && !before.endsWith("\n");
                        const inserted = (needsSpace ? " " : "") + v.variable;
                        set("greeting", before + inserted + after);
                        requestAnimationFrame(() => {
                          const pos = start + inserted.length;
                          el.focus();
                          el.setSelectionRange(pos, pos);
                        });
                      } else {
                        set("greeting", form.greeting + (form.greeting ? " " : "") + v.variable);
                      }
                    }}
                  >
                    {v.label} <span className="opacity-50 ml-0.5">{v.variable}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Click a variable above to insert it at cursor position</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isDefault} onChange={(e) => set("isDefault", e.target.checked)} className="rounded" />
                Default Persona
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="rounded" />
                Active
              </label>
            </div>
          </div>
        );
      case "personality":
        return (
          <div className="space-y-4">
            <div>
              <Label>Personality Description</Label>
              <Textarea value={form.personalityDescription} onChange={(e) => set("personalityDescription", e.target.value)}
                placeholder="Full personality brief the AI reads to 'become' this persona. Describe their tone, style, approach to conversations..." rows={5} />
            </div>
            <div>
              <Label>Signature Phrases (comma-separated)</Label>
              <Textarea value={form.signaturePhrases} onChange={(e) => set("signaturePhrases", e.target.value)}
                placeholder="I completely understand, That makes perfect sense, Let me make sure I've got this right" rows={3} />
            </div>
            <div>
              <Label>Banned Phrases (comma-separated)</Label>
              <Textarea value={form.bannedPhrases} onChange={(e) => set("bannedPhrases", e.target.value)}
                placeholder="To be honest, Actually, No problem, Trust me" rows={3} />
            </div>
            <div>
              <Label>Custom System Prompt Template (optional)</Label>
              <Textarea value={form.systemPromptTemplate} onChange={(e) => set("systemPromptTemplate", e.target.value)}
                placeholder="Override the default system prompt for this persona. Leave empty to use the standard prompt with personality injected." rows={5} />
              <p className="text-xs text-gray-500 mt-1">Available variables: {"{{persona_name}}, {{persona_personality}}, {{lead_name}}, {{call_context}}"}</p>
            </div>
          </div>
        );
      case "voice":
        return (
          <div className="space-y-4">
            <div>
              <Label>ElevenLabs Voice ID *</Label>
              <Input value={form.voiceId} onChange={(e) => set("voiceId", e.target.value)} placeholder="e.g. 9BWtsMINqrJLrRacOk9x" />
              <p className="text-xs text-gray-500 mt-1">Find voice IDs at elevenlabs.io/voice-library</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Stability ({form.voiceStability})</Label>
                <input type="range" min="0" max="1" step="0.05" value={form.voiceStability}
                  onChange={(e) => set("voiceStability", e.target.value)} className="w-full" />
                <p className="text-xs text-gray-500">Higher = more consistent, Lower = more expressive</p>
              </div>
              <div>
                <Label>Similarity Boost ({form.voiceSimilarityBoost})</Label>
                <input type="range" min="0" max="1" step="0.05" value={form.voiceSimilarityBoost}
                  onChange={(e) => set("voiceSimilarityBoost", e.target.value)} className="w-full" />
                <p className="text-xs text-gray-500">Higher = closer to original voice</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Style ({form.voiceStyle})</Label>
                <input type="range" min="0" max="1" step="0.05" value={form.voiceStyle}
                  onChange={(e) => set("voiceStyle", e.target.value)} className="w-full" />
                <p className="text-xs text-gray-500">Amplifies voice style. May reduce stability.</p>
              </div>
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.voiceUseSpeakerBoost} onChange={(e) => set("voiceUseSpeakerBoost", e.target.checked)} className="rounded" />
                  Speaker Boost
                </label>
              </div>
            </div>
          </div>
        );
      case "behaviour":
        return (
          <div className="space-y-4">
            <div>
              <Label>Handoff Intro</Label>
              <Textarea value={form.handoffIntro} onChange={(e) => set("handoffIntro", e.target.value)}
                placeholder="What this persona says when taking over a call from another persona..." rows={3} />
              <p className="text-xs text-gray-500 mt-1">Heard by the customer when THIS persona takes over mid-call</p>
            </div>
            <div>
              <Label>Handoff Outro</Label>
              <Textarea value={form.handoffOutro} onChange={(e) => set("handoffOutro", e.target.value)}
                placeholder="What this persona says when handing off to another persona..." rows={3} />
              <p className="text-xs text-gray-500 mt-1">Heard by the customer when THIS persona hands off to a colleague</p>
            </div>
          </div>
        );
      case "segments":
        return (
          <div className="space-y-4">
            <div>
              <Label>Target Segments (comma-separated)</Label>
              <Textarea value={form.targetSegments} onChange={(e) => set("targetSegments", e.target.value)}
                placeholder="region:india, industry:saas, size:startup, segment:enterprise" rows={3} />
              <p className="text-xs text-gray-500 mt-1">Format: category:value. The brain uses these to match personas to leads.</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {["region:india", "region:global", "region:uk", "region:uae", "segment:enterprise", "segment:technical", "size:startup", "size:small", "size:mid", "industry:saas", "industry:fintech", "language:hindi", "language:tamil"].map((seg) => (
                  <button key={seg} type="button" className={`text-xs px-2 py-0.5 rounded border transition-colors ${form.targetSegments.includes(seg) ? "bg-purple-600 text-white border-purple-600" : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500"}`}
                    onClick={() => {
                      const current = toArray(form.targetSegments);
                      const next = current.includes(seg) ? current.filter((s) => s !== seg) : [...current, seg];
                      set("targetSegments", next.join(", "));
                    }}>
                    {seg}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  /* ─── Detail View ─── */

  const DetailView = ({ p }: { p: any }) => {
    const convRate = p.totalCalls > 0 ? ((p.totalConversions / p.totalCalls) * 100).toFixed(1) : "—";
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${p.gender === "female" ? "bg-pink-900/30 text-pink-400" : "bg-blue-900/30 text-blue-400"}`}>
              {p.name?.[0]}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{p.name} {p.isDefault && <Badge className="ml-2 bg-yellow-600">Default</Badge>}</h3>
              <p className="text-sm text-gray-400">{p.speciality ? SPECIALITIES.find((s) => s.value === p.speciality)?.label : "General"} · {p.gender || "—"} · {p.age ? `Age ${p.age}` : "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => openEdit(p)}><Pencil className="w-4 h-4 mr-1" />Edit</Button>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)}><Trash2 className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Calls", value: p.totalCalls || 0 },
            { label: "Conversions", value: p.totalConversions || 0 },
            { label: "Conv. Rate", value: `${convRate}%` },
            { label: "Avg Satisfaction", value: p.avgSatisfactionScore ? `${p.avgSatisfactionScore.toFixed(1)}/5` : "—" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-lg font-semibold">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Personality */}
        {p.personalityDescription && (
          <div>
            <h4 className="text-sm font-semibold text-gray-400 mb-1">Personality</h4>
            <p className="text-sm bg-gray-900 rounded-lg p-3">{p.personalityDescription}</p>
          </div>
        )}

        {/* Description */}
        {p.description && (
          <div>
            <h4 className="text-sm font-semibold text-gray-400 mb-1">Description</h4>
            <p className="text-sm bg-gray-900 rounded-lg p-3">{p.description}</p>
          </div>
        )}

        {/* Greeting */}
        {p.greeting && (
          <div>
            <h4 className="text-sm font-semibold text-gray-400 mb-1">Greeting</h4>
            <p className="text-sm bg-blue-900/20 rounded-lg p-3 italic">&ldquo;{p.greeting}&rdquo;</p>
          </div>
        )}

        {/* Backstory */}
        {p.backstory && (
          <div>
            <h4 className="text-sm font-semibold text-gray-400 mb-1">Backstory</h4>
            <p className="text-sm bg-gray-900 rounded-lg p-3">{p.backstory}</p>
          </div>
        )}

        {/* Languages */}
        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-1">Languages</h4>
          <div className="flex flex-wrap gap-1">
            {(p.languages || []).map((l: string) => (
              <Badge key={l} variant="secondary">{l}</Badge>
            ))}
          </div>
        </div>

        {/* Phrases */}
        {(p.signaturePhrases?.length > 0 || p.bannedPhrases?.length > 0) && (
          <div className="grid grid-cols-2 gap-4">
            {p.signaturePhrases?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-400 mb-1">Signature Phrases</h4>
                <ul className="text-sm space-y-1">
                  {p.signaturePhrases.map((ph: string, i: number) => (
                    <li key={i} className="bg-green-900/20 rounded px-2 py-1">&ldquo;{ph}&rdquo;</li>
                  ))}
                </ul>
              </div>
            )}
            {p.bannedPhrases?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-400 mb-1">Banned Phrases</h4>
                <ul className="text-sm space-y-1">
                  {p.bannedPhrases.map((ph: string, i: number) => (
                    <li key={i} className="bg-red-900/20 rounded px-2 py-1 line-through">&ldquo;{ph}&rdquo;</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Handoff */}
        {(p.handoffIntro || p.handoffOutro) && (
          <div>
            <h4 className="text-sm font-semibold text-gray-400 mb-1">Call Handoff Lines</h4>
            <div className="space-y-2">
              {p.handoffIntro && (
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Taking over a call:</p>
                  <p className="text-sm italic">&ldquo;{p.handoffIntro}&rdquo;</p>
                </div>
              )}
              {p.handoffOutro && (
                <div className="bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Handing off:</p>
                  <p className="text-sm italic">&ldquo;{p.handoffOutro}&rdquo;</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Voice Settings */}
        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-1">Voice Settings</h4>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Voice ID", value: p.voiceId?.slice(0, 12) + "..." },
              { label: "Stability", value: p.voiceStability ?? 0.5 },
              { label: "Similarity", value: p.voiceSimilarityBoost ?? 0.75 },
              { label: "Style", value: p.voiceStyle ?? 0.0 },
            ].map((v) => (
              <div key={v.label} className="bg-gray-900 rounded px-2 py-1.5 text-center">
                <p className="text-xs text-gray-500">{v.label}</p>
                <p className="text-sm font-mono">{v.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Target Segments */}
        {p.targetSegments?.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-400 mb-1">Target Segments</h4>
            <div className="flex flex-wrap gap-1">
              {p.targetSegments.map((seg: string) => (
                <Badge key={seg} variant="outline" className="text-purple-400 border-purple-600">{seg}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ─── Render ─── */

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ai-sales"><ArrowLeft className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer" /></Link>
          <div>
            <h1 className="text-2xl font-bold">Sales Agents</h1>
            <p className="text-sm text-gray-400">Create and manage AI sales agents — each a complete character identity with voice, personality, and scripts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSeed}>Seed Defaults</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" />New Persona</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Persona" : "Create Persona"}</DialogTitle>
              </DialogHeader>

              {/* Tabs */}
              <div className="flex gap-1 border-b border-gray-800 mb-4">
                {(["identity", "personality", "voice", "behaviour", "segments"] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-3 py-2 text-sm capitalize border-b-2 transition-colors ${activeTab === tab ? "border-blue-500 text-blue-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
                    {tab}
                  </button>
                ))}
              </div>

              {tabContent()}

              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-800">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Layout: list + detail */}
      <div className="grid grid-cols-12 gap-6">
        {/* Persona Cards */}
        <div className="col-span-5 space-y-3">
          {loading ? (
            <p className="text-gray-500 text-center py-8">Loading personas...</p>
          ) : personas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">No personas yet</p>
                <p className="text-sm text-gray-500 mb-4">Click &ldquo;Seed Defaults&rdquo; to create Aria, Priya, and Raj, or create your own.</p>
                <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Create Persona</Button>
              </CardContent>
            </Card>
          ) : (
            personas.map((p) => (
              <Card key={p.id} className={`cursor-pointer transition-colors hover:border-gray-600 ${selectedId === p.id ? "border-blue-500 bg-blue-950/20" : ""}`}
                onClick={() => setSelectedId(p.id)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${p.gender === "female" ? "bg-pink-900/30 text-pink-400" : "bg-blue-900/30 text-blue-400"}`}>
                      {p.name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">{p.name}</span>
                        {p.isDefault && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />}
                        {!p.isActive && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {p.speciality ? SPECIALITIES.find((s) => s.value === p.speciality)?.label : "General"}
                        {p.languages?.length > 0 && ` · ${p.languages.slice(0, 3).join(", ")}${p.languages.length > 3 ? "..." : ""}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono">{p.totalCalls || 0} calls</p>
                      <p className="text-xs text-gray-500">{p.totalCalls > 0 ? `${((p.totalConversions / p.totalCalls) * 100).toFixed(0)}%` : "—"} conv</p>
                    </div>
                  </div>
                  {p.personalityDescription && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">{p.personalityDescription}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div className="col-span-7">
          {selected ? (
            <Card>
              <CardContent className="p-6">
                <DetailView p={selected} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-20 text-center">
                <Mic className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Select a persona to view details</p>
                <p className="text-sm text-gray-500 mt-1">Each persona is a complete AI sales identity with personality, voice, and behaviour settings</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
