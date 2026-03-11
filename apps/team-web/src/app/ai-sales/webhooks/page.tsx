"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aiSalesApi } from "@/lib/api";
import {
  Activity,
  ArrowLeft,
  Check,
  ExternalLink,
  Globe,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Tab = "endpoints" | "create" | "deliveries";

interface Endpoint {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  consecutiveFailures: number;
  totalDelivered: number;
  totalFailed: number;
  createdAt: string;
  _count?: { deliveries: number };
}

interface Delivery {
  id: string;
  endpointId: string;
  event: string;
  statusCode?: number;
  error?: string;
  deliveredAt?: string;
  createdAt: string;
  endpoint?: { name: string; url: string };
}

const ALL_EVENTS = [
  "call.completed",
  "call.failed",
  "lead.converted",
  "lead.scored",
  "lead.stage_changed",
  "experiment.completed",
  "follow_up.scheduled",
];

export default function WebhooksPage() {
  const [tab, setTab] = useState<Tab>("endpoints");
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    url: "",
    events: ["call.completed"] as string[],
    secret: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [epRes, statsRes] = await Promise.all([
        aiSalesApi.listWebhooks(),
        aiSalesApi.getWebhookStats(),
      ]);
      setEndpoints(epRes.data);
      setStats(statsRes.data);
    } catch {
      toast.error("Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadDeliveries = async (epId: string) => {
    setSelectedEndpoint(epId);
    setTab("deliveries");
    const { data } = await aiSalesApi.getWebhookDeliveries(epId);
    setDeliveries(data);
  };

  const create = async () => {
    let url: URL;
    try { url = new URL(form.url); } catch { toast.error("Invalid URL"); return; }
    try {
      await aiSalesApi.createWebhook({
        name: form.name,
        url: form.url,
        events: form.events,
        secret: form.secret || undefined,
      });
      toast.success("Webhook created");
      setTab("endpoints");
      load();
    } catch { toast.error("Failed to create webhook"); }
  };

  const toggle = async (id: string, isActive: boolean) => {
    await aiSalesApi.toggleWebhook(id, isActive);
    toast.success(isActive ? "Enabled" : "Disabled");
    load();
  };

  const test = async (id: string) => {
    await aiSalesApi.testWebhook(id);
    toast.success("Test ping sent");
  };

  const remove = async (id: string) => {
    await aiSalesApi.deleteWebhook(id);
    toast.success("Webhook deleted");
    load();
  };

  const retry = async (id: string) => {
    await aiSalesApi.retryDelivery(id);
    toast.success("Retry sent");
    if (selectedEndpoint) loadDeliveries(selectedEndpoint);
  };

  const toggleEvent = (event: string) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(event)
        ? f.events.filter((e) => e !== event)
        : [...f.events, event],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ai-sales" className="text-zinc-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-400" />
            Webhooks / CRM Push
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1 rounded bg-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-700"><RefreshCw className="h-4 w-4" /> Refresh</button>
          <button onClick={() => setTab(tab === "create" ? "endpoints" : "create")} className="flex items-center gap-1 rounded bg-yellow-600 px-3 py-1.5 text-sm hover:bg-yellow-500"><Plus className="h-4 w-4" /> New Webhook</button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="border-zinc-800 bg-zinc-900"><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{stats.totalEndpoints}</div><div className="text-xs text-zinc-500">Total Endpoints</div></CardContent></Card>
          <Card className="border-zinc-800 bg-zinc-900"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-green-400">{stats.activeEndpoints}</div><div className="text-xs text-zinc-500">Active</div></CardContent></Card>
          <Card className="border-zinc-800 bg-zinc-900"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-blue-400">{stats.totalDelivered}</div><div className="text-xs text-zinc-500">Delivered</div></CardContent></Card>
          <Card className="border-zinc-800 bg-zinc-900"><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-red-400">{stats.totalFailed}</div><div className="text-xs text-zinc-500">Failed</div></CardContent></Card>
        </div>
      )}

      {/* Create Tab */}
      {tab === "create" && (
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader><CardTitle>New Webhook Endpoint</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Name</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full rounded bg-zinc-800 px-3 py-2 text-sm" placeholder="My CRM Webhook" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">URL</label>
                <input value={form.url} onChange={e => setForm({...form, url: e.target.value})} className="w-full rounded bg-zinc-800 px-3 py-2 text-sm" placeholder="https://your-crm.com/webhook" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">HMAC Secret (optional)</label>
              <input value={form.secret} onChange={e => setForm({...form, secret: e.target.value})} className="w-full rounded bg-zinc-800 px-3 py-2 text-sm font-mono" placeholder="your-secret-key" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Events</label>
              <div className="flex flex-wrap gap-2">
                {ALL_EVENTS.map((ev) => (
                  <button key={ev} onClick={() => toggleEvent(ev)} className={`rounded px-3 py-1 text-xs ${form.events.includes(ev) ? "bg-yellow-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>{ev}</button>
                ))}
              </div>
            </div>
            <button onClick={create} className="rounded bg-yellow-600 px-4 py-2 text-sm font-medium hover:bg-yellow-500">Create Webhook</button>
          </CardContent>
        </Card>
      )}

      {/* Deliveries Tab */}
      {tab === "deliveries" && (
        <div className="space-y-3">
          <button onClick={() => setTab("endpoints")} className="text-sm text-zinc-400 hover:text-white">&larr; Back to endpoints</button>
          {deliveries.length === 0 ? (
            <Card className="border-zinc-800 bg-zinc-900 p-10 text-center text-zinc-500">No deliveries yet</Card>
          ) : deliveries.map((d) => (
            <Card key={d.id} className="border-zinc-800 bg-zinc-900">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{d.event}</Badge>
                    {d.statusCode && d.statusCode >= 200 && d.statusCode < 300 ? (
                      <Badge className="bg-green-500/10 text-green-400">{d.statusCode} OK</Badge>
                    ) : d.statusCode ? (
                      <Badge className="bg-red-500/10 text-red-400">{d.statusCode}</Badge>
                    ) : d.error ? (
                      <Badge className="bg-red-500/10 text-red-400">Error</Badge>
                    ) : null}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {new Date(d.createdAt).toLocaleString()}
                    {d.error && <span className="ml-2 text-red-400">{d.error}</span>}
                  </div>
                </div>
                {d.error && (
                  <button onClick={() => retry(d.id)} className="rounded bg-zinc-800 p-1.5 text-zinc-400 hover:bg-zinc-700" title="Retry"><RotateCcw className="h-4 w-4" /></button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Endpoints Tab */}
      {tab === "endpoints" && (
        loading ? (
          <div className="text-center text-zinc-500 py-10">Loading webhooks...</div>
        ) : endpoints.length === 0 ? (
          <Card className="border-zinc-800 bg-zinc-900 p-10 text-center text-zinc-500">
            No webhooks configured. Push call outcomes to your CRM!
          </Card>
        ) : (
          <div className="space-y-3">
            {endpoints.map((ep) => (
              <Card key={ep.id} className="border-zinc-800 bg-zinc-900">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className="h-4 w-4 text-zinc-500" />
                        <span className="font-medium">{ep.name}</span>
                        <Badge className={ep.isActive ? "bg-green-500/10 text-green-400" : "bg-zinc-500/10 text-zinc-400"}>
                          {ep.isActive ? "Active" : "Disabled"}
                        </Badge>
                        {ep.consecutiveFailures >= 5 && (
                          <Badge className="bg-red-500/10 text-red-400">Unhealthy</Badge>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 font-mono truncate max-w-lg">{ep.url}</div>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {ep.events.map((ev) => (
                          <span key={ev} className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">{ev}</span>
                        ))}
                      </div>
                      <div className="text-xs text-zinc-500 mt-2">
                        {ep.totalDelivered} delivered · {ep.totalFailed} failed · {ep._count?.deliveries || 0} total
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => toggle(ep.id, !ep.isActive)} className={`rounded p-1.5 ${ep.isActive ? "bg-yellow-600/20 text-yellow-400" : "bg-green-600/20 text-green-400"} hover:opacity-80`} title={ep.isActive ? "Disable" : "Enable"}>
                        {ep.isActive ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button onClick={() => test(ep.id)} className="rounded bg-blue-600/20 p-1.5 text-blue-400 hover:bg-blue-600/30" title="Test"><Send className="h-4 w-4" /></button>
                      <button onClick={() => loadDeliveries(ep.id)} className="rounded bg-zinc-700/50 p-1.5 text-zinc-400 hover:bg-zinc-700" title="Deliveries"><Activity className="h-4 w-4" /></button>
                      <button onClick={() => remove(ep.id)} className="rounded bg-red-600/20 p-1.5 text-red-400 hover:bg-red-600/30" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}
