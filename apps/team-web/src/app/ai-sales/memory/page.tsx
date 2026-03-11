"use client";

import { useState, useEffect, useCallback } from "react";
import { aiSalesApi } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Save,
  Plus,
  Trash2,
  Brain,
  Globe,
  Phone,
  Link2,
  User,
  Sparkles,
  RefreshCcw,
  Settings2,
} from "lucide-react";

interface MemoryEntry {
  id: string;
  category: string;
  key: string;
  value: string;
  label: string | null;
}

interface BehaviorInsight {
  id: string;
  category: string;
  segment: string;
  pattern: string;
  response: string;
  confidence: number;
  sampleSize: number;
  isActive: boolean;
}

const CATEGORY_ICONS: Record<string, typeof Brain> = {
  company: Globe,
  phones: Phone,
  urls: Link2,
  persona: User,
  product: Sparkles,
  advanced: Settings2,
};

const CATEGORY_LABELS: Record<string, string> = {
  company: "Company Information",
  phones: "Phone Numbers",
  urls: "Links & URLs",
  persona: "AI Persona",
  product: "Product Info",
  advanced: "Advanced Settings",
};

const INSIGHT_CATEGORIES = [
  "objection_handling",
  "greeting_response",
  "buying_signal",
  "preference",
  "cultural",
  "pricing_reaction",
];

const INSIGHT_CATEGORY_LABELS: Record<string, string> = {
  objection_handling: "Objection Handling",
  greeting_response: "Greeting Response",
  buying_signal: "Buying Signal",
  preference: "Preference",
  cultural: "Cultural",
  pricing_reaction: "Pricing Reaction",
};

export default function AgentMemoryPage() {
  const [memory, setMemory] = useState<MemoryEntry[]>([]);
  const [insights, setInsights] = useState<BehaviorInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedMemory, setEditedMemory] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"memory" | "behavior" | "advanced">("memory");

  // New entry form
  const [newEntry, setNewEntry] = useState({ category: "company", key: "", value: "", label: "" });
  const [showNewEntry, setShowNewEntry] = useState(false);

  // New insight form
  const [newInsight, setNewInsight] = useState({
    category: "objection_handling",
    segment: "all",
    pattern: "",
    response: "",
    confidence: 0.5,
  });
  const [showNewInsight, setShowNewInsight] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [memRes, insightsRes] = await Promise.all([
        aiSalesApi.getMemory(),
        aiSalesApi.listBehaviorInsights(),
      ]);
      setMemory(memRes.data || []);
      setInsights(insightsRes.data || []);
      setEditedMemory({});
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMemoryChange = (id: string, value: string) => {
    setEditedMemory((prev) => ({ ...prev, [id]: value }));
  };

  const saveMemoryChanges = async () => {
    setSaving(true);
    try {
      const entries = Object.entries(editedMemory).map(([id, value]) => {
        const entry = memory.find((m) => m.id === id);
        return { category: entry!.category, key: entry!.key, value, label: entry?.label ?? undefined };
      });
      if (entries.length > 0) {
        await aiSalesApi.bulkSetMemory(entries);
      }
      toast.success(`Saved ${entries.length} changes`);
      await loadData();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const addNewEntry = async () => {
    if (!newEntry.key || !newEntry.value) {
      toast.error("Key and value are required");
      return;
    }
    try {
      await aiSalesApi.setMemory({
        category: newEntry.category,
        key: newEntry.key.toLowerCase().replace(/\s+/g, "_"),
        value: newEntry.value,
        label: newEntry.label || undefined,
      });
      toast.success("Entry added");
      setNewEntry({ category: "company", key: "", value: "", label: "" });
      setShowNewEntry(false);
      await loadData();
    } catch {
      toast.error("Failed to add entry");
    }
  };

  const deleteEntry = async (category: string, key: string) => {
    try {
      await aiSalesApi.deleteMemory(category, key);
      toast.success("Deleted");
      await loadData();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const addNewInsight = async () => {
    if (!newInsight.pattern || !newInsight.response) {
      toast.error("Pattern and response are required");
      return;
    }
    try {
      await aiSalesApi.createBehaviorInsight(newInsight);
      toast.success("Insight added");
      setNewInsight({
        category: "objection_handling",
        segment: "all",
        pattern: "",
        response: "",
        confidence: 0.5,
      });
      setShowNewInsight(false);
      await loadData();
    } catch {
      toast.error("Failed to add insight");
    }
  };

  const toggleInsightActive = async (insight: BehaviorInsight) => {
    try {
      await aiSalesApi.updateBehaviorInsight(insight.id, { isActive: !insight.isActive });
      setInsights((prev) =>
        prev.map((i) => (i.id === insight.id ? { ...i, isActive: !i.isActive } : i)),
      );
    } catch {
      toast.error("Failed to update");
    }
  };

  const deleteInsight = async (id: string) => {
    try {
      await aiSalesApi.deleteBehaviorInsight(id);
      toast.success("Deleted");
      setInsights((prev) => prev.filter((i) => i.id !== id));
    } catch {
      toast.error("Failed to delete");
    }
  };

  const seedAll = async () => {
    try {
      await Promise.all([aiSalesApi.seedMemory(), aiSalesApi.seedBehaviorInsights()]);
      toast.success("Default data seeded");
      await loadData();
    } catch {
      toast.error("Failed to seed");
    }
  };

  // Group memory by category — separate advanced from others
  const grouped = memory.reduce<Record<string, MemoryEntry[]>>((acc, entry) => {
    if (!acc[entry.category]) acc[entry.category] = [];
    acc[entry.category].push(entry);
    return acc;
  }, {});

  const advancedEntries = grouped["advanced"] || [];
  const businessGrouped = Object.fromEntries(
    Object.entries(grouped).filter(([cat]) => cat !== "advanced"),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500" />
      </div>
    );
  }

  const hasUnsavedChanges = Object.keys(editedMemory).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-500" />
            Agent Memory
          </h1>
          <p className="text-muted-foreground">
            Company information, URLs, phone numbers, and customer behavior patterns.
            Changes take effect within 60 seconds — no redeploy needed.
          </p>
        </div>
        <div className="flex gap-2">
          {memory.length === 0 && (
            <Button variant="outline" onClick={seedAll}>
              <Sparkles className="mr-2 h-4 w-4" />
              Seed Defaults
            </Button>
          )}
          <Button variant="outline" onClick={loadData}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("memory")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "memory"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Business Config ({memory.length})
        </button>
        <button
          onClick={() => setActiveTab("behavior")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "behavior"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Behavior Insights ({insights.length})
        </button>
        <button
          onClick={() => setActiveTab("advanced")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "advanced"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Advanced Settings
        </button>
      </div>

      {/* ─── Memory Tab ─── */}
      {activeTab === "memory" && (
        <div className="space-y-6">
          {/* Save bar */}
          {hasUnsavedChanges && (
            <div className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <span className="text-sm text-yellow-800 dark:text-yellow-200">
                {Object.keys(editedMemory).length} unsaved change(s)
              </span>
              <Button onClick={saveMemoryChanges} disabled={saving} size="sm">
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save All"}
              </Button>
            </div>
          )}

          {/* Category cards */}
          {Object.entries(businessGrouped).map(([category, entries]) => {
            const IconComp = CATEGORY_ICONS[category] || Brain;
            return (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconComp className="h-5 w-5 text-muted-foreground" />
                    {CATEGORY_LABELS[category] || category}
                  </CardTitle>
                  <CardDescription>
                    {category === "phones" && "Phone numbers used by the AI agent for calls and messaging"}
                    {category === "urls" && "Links sent to customers during and after calls"}
                    {category === "company" && "Company identity used in AI conversations"}
                    {category === "persona" && "AI agent personality and behavior settings"}
                    {category === "product" && "Product information for sales conversations"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {entries.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">
                          {entry.label || entry.key}
                        </Label>
                        {entry.value.length > 100 ? (
                          <Textarea
                            value={editedMemory[entry.id] ?? entry.value}
                            onChange={(e) => handleMemoryChange(entry.id, e.target.value)}
                            rows={3}
                          />
                        ) : (
                          <Input
                            value={editedMemory[entry.id] ?? entry.value}
                            onChange={(e) => handleMemoryChange(entry.id, e.target.value)}
                          />
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mt-5 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteEntry(entry.category, entry.key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}

          {/* Add new entry */}
          {showNewEntry ? (
            <Card>
              <CardHeader>
                <CardTitle>Add New Entry</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={newEntry.category}
                      onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                    >
                      <option value="company">Company</option>
                      <option value="phones">Phones</option>
                      <option value="urls">URLs</option>
                      <option value="persona">Persona</option>
                      <option value="product">Product</option>
                      <option value="region">Region</option>
                    </select>
                  </div>
                  <div>
                    <Label>Key</Label>
                    <Input
                      placeholder="e.g. support_email"
                      value={newEntry.key}
                      onChange={(e) => setNewEntry({ ...newEntry, key: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Label (display name)</Label>
                  <Input
                    placeholder="e.g. Support Email"
                    value={newEntry.label}
                    onChange={(e) => setNewEntry({ ...newEntry, label: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Value</Label>
                  <Textarea
                    placeholder="Enter the value..."
                    value={newEntry.value}
                    onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowNewEntry(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addNewEntry}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button variant="outline" onClick={() => setShowNewEntry(true)} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add New Entry
            </Button>
          )}
        </div>
      )}

      {/* ─── Behavior Insights Tab ─── */}
      {activeTab === "behavior" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Customer behavior patterns segmented by region, gender, language, etc.
            These feed into the AI agent&apos;s conversation strategy.
          </p>

          {/* Insight cards */}
          {insights.map((insight) => (
            <Card key={insight.id} className={!insight.isActive ? "opacity-50" : ""}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300">
                        {INSIGHT_CATEGORY_LABELS[insight.category] || insight.category}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                        {insight.segment}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(insight.confidence * 100)}% confidence · {insight.sampleSize} samples
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Pattern: {insight.pattern}</p>
                      <p className="text-sm text-muted-foreground mt-1">Response: {insight.response}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleInsightActive(insight)}
                    >
                      {insight.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => deleteInsight(insight.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {insights.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No behavior insights yet.</p>
              <Button variant="outline" className="mt-4" onClick={seedAll}>
                <Sparkles className="mr-2 h-4 w-4" />
                Seed Default Insights
              </Button>
            </div>
          )}

          {/* Add new insight */}
          {showNewInsight ? (
            <Card>
              <CardHeader>
                <CardTitle>Add Behavior Insight</CardTitle>
                <CardDescription>
                  Document what customers do and what response works best
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Category</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={newInsight.category}
                      onChange={(e) => setNewInsight({ ...newInsight, category: e.target.value })}
                    >
                      {INSIGHT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {INSIGHT_CATEGORY_LABELS[c]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Segment</Label>
                    <Input
                      placeholder='e.g. region:asia, gender:female, all'
                      value={newInsight.segment}
                      onChange={(e) => setNewInsight({ ...newInsight, segment: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Confidence (0-1)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={newInsight.confidence}
                      onChange={(e) =>
                        setNewInsight({ ...newInsight, confidence: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Pattern (what customers do/say)</Label>
                  <Textarea
                    placeholder="e.g. Customer says 'too expensive' or hesitates after hearing the price"
                    value={newInsight.pattern}
                    onChange={(e) => setNewInsight({ ...newInsight, pattern: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Best Response (what works)</Label>
                  <Textarea
                    placeholder="e.g. Acknowledge concern, then frame as investment with ROI comparison"
                    value={newInsight.response}
                    onChange={(e) => setNewInsight({ ...newInsight, response: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowNewInsight(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addNewInsight}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Insight
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button variant="outline" onClick={() => setShowNewInsight(true)} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add New Insight
            </Button>
          )}
        </div>
      )}

      {/* ─── Advanced Settings Tab ─── */}
      {activeTab === "advanced" && (
        <AdvancedSettingsTab
          entries={advancedEntries}
          editedMemory={editedMemory}
          onMemoryChange={handleMemoryChange}
          onSave={saveMemoryChanges}
          saving={saving}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      )}
    </div>
  );
}

/* ─── Advanced Settings Component ─── */

const ADVANCED_SETTINGS_META: Record<
  string,
  { label: string; description: string; type: "select" | "number" | "text" | "textarea" | "secret"; options?: string[] }
> = {
  audio_mode: {
    label: "Audio Mode",
    description:
      "How audio flows between Twilio and the AI. 'deepgram' uses STT→LLM→TTS pipeline. 'gemini_live' uses native Gemini audio-to-audio (lower latency, less voice control).",
    type: "select",
    options: ["deepgram", "gemini_live"],
  },
  stt_provider: {
    label: "STT Provider",
    description:
      "Speech-to-text routing. 'auto' detects language on first audio chunk — routes Hindi/regional to Sarvam AI, English to Google STT. 'google' always uses Google Cloud STT (best for Indian English accent). 'sarvam' always uses Sarvam AI (best for Hindi/regional). 'deepgram' is last resort (poor Indian accent support).",
    type: "select",
    options: ["auto", "google", "sarvam", "deepgram"],
  },
  tts_provider: {
    label: "TTS Provider",
    description:
      "Text-to-speech engine. 'elevenlabs' (default) for high-quality English voices. 'inworld' for Inworld TTS alternative.",
    type: "select",
    options: ["elevenlabs", "inworld"],
  },
  claude_escalation_threshold: {
    label: "Claude Escalation Threshold ($)",
    description:
      "Minimum estimated deal value to trigger Claude Sonnet takeover during a call. Below this value, Gemini Flash-Lite handles everything. Higher = fewer Claude escalations = lower cost.",
    type: "number",
  },
  inworld_api_key: {
    label: "Inworld API Key",
    description: "API key for Inworld TTS. Only needed if TTS Provider is set to 'inworld'.",
    type: "secret",
  },
  inworld_voice_id: {
    label: "Inworld Voice ID",
    description: "Inworld voice to use for TTS. Only needed if TTS Provider is set to 'inworld'.",
    type: "text",
  },
  stt_keywords: {
    label: "STT Keyword Boosting",
    description:
      "Comma-separated keywords to boost recognition accuracy in Deepgram. Add your company name, product terms, gold/jewelry jargon. These words will be recognized more accurately during calls.",
    type: "textarea",
  },
};

function AdvancedSettingsTab({
  entries,
  editedMemory,
  onMemoryChange,
  onSave,
  saving,
  hasUnsavedChanges,
}: {
  entries: MemoryEntry[];
  editedMemory: Record<string, string>;
  onMemoryChange: (id: string, value: string) => void;
  onSave: () => void;
  saving: boolean;
  hasUnsavedChanges: boolean;
}) {
  return (
    <div className="space-y-6">
      {hasUnsavedChanges && (
        <div className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <span className="text-sm text-yellow-800 dark:text-yellow-200">
            {Object.keys(editedMemory).length} unsaved change(s)
          </span>
          <Button onClick={onSave} disabled={saving} size="sm">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save All"}
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            Advanced Settings
          </CardTitle>
          <CardDescription>
            Audio pipeline, STT/TTS providers, AI escalation, and keyword boosting.
            Changes take effect within 60 seconds — no redeploy needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {entries.map((entry) => {
            const meta = ADVANCED_SETTINGS_META[entry.key];
            if (!meta) {
              // Unknown advanced key — render as plain text input
              return (
                <div key={entry.id}>
                  <Label className="text-xs text-muted-foreground">{entry.label || entry.key}</Label>
                  <Input
                    value={editedMemory[entry.id] ?? entry.value}
                    onChange={(e) => onMemoryChange(entry.id, e.target.value)}
                  />
                </div>
              );
            }

            const currentValue = editedMemory[entry.id] ?? entry.value;

            return (
              <div key={entry.id} className="space-y-1">
                <Label className="text-sm font-medium">{meta.label}</Label>
                <p className="text-xs text-muted-foreground mb-2">{meta.description}</p>

                {meta.type === "select" && (
                  <select
                    className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={currentValue}
                    onChange={(e) => onMemoryChange(entry.id, e.target.value)}
                  >
                    {meta.options!.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {meta.type === "number" && (
                  <Input
                    type="number"
                    className="max-w-xs"
                    value={currentValue}
                    onChange={(e) => onMemoryChange(entry.id, e.target.value)}
                  />
                )}

                {meta.type === "text" && (
                  <Input
                    className="max-w-md"
                    value={currentValue}
                    onChange={(e) => onMemoryChange(entry.id, e.target.value)}
                    placeholder={meta.label}
                  />
                )}

                {meta.type === "secret" && (
                  <Input
                    type="password"
                    className="max-w-md"
                    value={currentValue}
                    onChange={(e) => onMemoryChange(entry.id, e.target.value)}
                    placeholder="Enter API key..."
                  />
                )}

                {meta.type === "textarea" && (
                  <Textarea
                    className="max-w-lg"
                    rows={3}
                    value={currentValue}
                    onChange={(e) => onMemoryChange(entry.id, e.target.value)}
                    placeholder="comma, separated, keywords"
                  />
                )}
              </div>
            );
          })}

          {entries.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Settings2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No advanced settings found. Run &quot;Seed Defaults&quot; from the Business Config tab first.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Environment Variables (set on Railway)</CardTitle>
          <CardDescription>
            These API keys stay as environment variables — not editable from the UI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-muted-foreground">
            <span className="font-mono">GEMINI_API_KEY</span><span>Google AI — Gemini Flash-Lite</span>
            <span className="font-mono">ANTHROPIC_API_KEY</span><span>Anthropic — Claude Sonnet</span>
            <span className="font-mono">GOOGLE_STT_API_KEY</span><span>Google Cloud — STT (Indian English)</span>
            <span className="font-mono">SARVAM_API_KEY</span><span>Sarvam AI — Indian language STT</span>
            <span className="font-mono">DEEPGRAM_API_KEY</span><span>Deepgram — fallback STT</span>
            <span className="font-mono">ELEVENLABS_API_KEY</span><span>ElevenLabs — TTS voice</span>
            <span className="font-mono">ELEVENLABS_VOICE_ID</span><span>ElevenLabs voice to use</span>
            <span className="font-mono">TWILIO_ACCOUNT_SID</span><span>Twilio account SID</span>
            <span className="font-mono">TWILIO_AUTH_TOKEN</span><span>Twilio auth token</span>
            <span className="font-mono">TWILIO_PHONE_NUMBER</span><span>Your Twilio phone number</span>
            <span className="font-mono">WEBHOOK_BASE_URL</span><span>Base URL for Twilio webhooks</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
