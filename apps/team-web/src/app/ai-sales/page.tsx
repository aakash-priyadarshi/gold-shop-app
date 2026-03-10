"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { aiSalesApi } from "@/lib/api";
import { Bot, Phone, Plus, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const PIPELINE_STAGES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];
const STAGE_COLORS: Record<string, string> = {
  NEW: "secondary",
  CONTACTED: "default",
  QUALIFIED: "warning",
  PROPOSAL: "default",
  NEGOTIATION: "warning",
  WON: "success",
  LOST: "destructive",
};

export default function AiSalesPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [callStats, setCallStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddLead, setShowAddLead] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: "",
    email: "",
    phone: "",
    source: "WEBSITE",
    notes: "",
  });

  const load = () => {
    setLoading(true);
    Promise.allSettled([
      aiSalesApi.listAgents(),
      aiSalesApi.listLeads(),
      aiSalesApi.getCallStats(),
    ]).then(([agentRes, leadRes, statsRes]) => {
      setAgents(
        agentRes.status === "fulfilled"
          ? Array.isArray(agentRes.value.data)
            ? agentRes.value.data
            : (agentRes.value.data?.data ?? [])
          : [],
      );
      setLeads(
        leadRes.status === "fulfilled"
          ? Array.isArray(leadRes.value.data)
            ? leadRes.value.data
            : (leadRes.value.data?.data ?? [])
          : [],
      );
      setCallStats(
        statsRes.status === "fulfilled" ? statsRes.value.data : null,
      );
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreateLead = async () => {
    try {
      await aiSalesApi.createLead(leadForm);
      toast.success("Lead created");
      setShowAddLead(false);
      setLeadForm({
        name: "",
        email: "",
        phone: "",
        source: "WEBSITE",
        notes: "",
      });
      load();
    } catch {
      toast.error("Failed to create lead");
    }
  };

  const moveStage = async (leadId: string, stage: string) => {
    try {
      await aiSalesApi.moveLeadStage(leadId, stage);
      load();
    } catch {
      toast.error("Failed to move lead");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Sales</h1>
        <p className="text-muted-foreground">
          Manage AI agents, leads, and call campaigns
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">AI Agents</CardTitle>
            <Bot className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{agents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{leads.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{callStats?.totalCalls ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-gold-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {callStats?.conversionRate ?? "0"}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leads">
        <TabsList>
          <TabsTrigger value="leads">Lead Pipeline</TabsTrigger>
          <TabsTrigger value="agents">AI Agents</TabsTrigger>
          <TabsTrigger value="calls">Call Log</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lead
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Lead</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={leadForm.name}
                      onChange={(e) =>
                        setLeadForm({ ...leadForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={leadForm.email}
                        onChange={(e) =>
                          setLeadForm({ ...leadForm, email: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={leadForm.phone}
                        onChange={(e) =>
                          setLeadForm({ ...leadForm, phone: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Source</Label>
                    <Select
                      value={leadForm.source}
                      onValueChange={(v) =>
                        setLeadForm({ ...leadForm, source: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "WEBSITE",
                          "REFERRAL",
                          "SOCIAL_MEDIA",
                          "WALK_IN",
                          "COLD_CALL",
                          "OTHER",
                        ].map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={leadForm.notes}
                      onChange={(e) =>
                        setLeadForm({ ...leadForm, notes: e.target.value })
                      }
                    />
                  </div>
                  <Button onClick={handleCreateLead}>Create Lead</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Pipeline view */}
          <div className="overflow-x-auto">
            <div className="flex gap-4 min-w-[900px]">
              {PIPELINE_STAGES.map((stage) => {
                const stageLeads = leads.filter((l: any) => l.stage === stage);
                return (
                  <div key={stage} className="flex-1 min-w-[200px]">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">
                        {stage.replace(/_/g, " ")}
                      </h3>
                      <Badge variant={STAGE_COLORS[stage] as any}>
                        {stageLeads.length}
                      </Badge>
                    </div>
                    <div className="space-y-2 min-h-[200px] rounded-lg bg-muted/30 p-2">
                      {stageLeads.map((lead: any) => (
                        <Card key={lead.id}>
                          <CardContent className="p-3">
                            <p className="font-medium text-sm">{lead.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {lead.email}
                            </p>
                            {lead.phone && (
                              <p className="text-xs text-muted-foreground">
                                {lead.phone}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {PIPELINE_STAGES.filter((s) => s !== stage)
                                .slice(0, 3)
                                .map((s) => (
                                  <Button
                                    key={s}
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 text-[9px] px-1.5"
                                    onClick={() => moveStage(lead.id, s)}
                                  >
                                    {s.replace(/_/g, " ")}
                                  </Button>
                                ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          {agents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No AI agents configured
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent: any) => (
                <Card key={agent.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-gold-500" />
                        <p className="font-semibold">{agent.name}</p>
                      </div>
                      <Badge variant={agent.isActive ? "success" : "secondary"}>
                        {agent.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {agent.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {agent.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <span>Voice: {agent.voiceId ?? "Default"}</span>
                      <span>Language: {agent.language ?? "en"}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calls">
          <CallsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CallsTab() {
  const [calls, setCalls] = useState<any[]>([]);
  useEffect(() => {
    aiSalesApi
      .listCalls()
      .then((res) => {
        setCalls(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
      })
      .catch(() => {});
  }, []);

  return calls.length === 0 ? (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        No calls recorded yet
      </CardContent>
    </Card>
  ) : (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left">Lead</th>
            <th className="p-3 text-left">Agent</th>
            <th className="p-3 text-center">Status</th>
            <th className="p-3 text-center">Duration</th>
            <th className="p-3 text-left">Date</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call: any) => (
            <tr key={call.id} className="border-b">
              <td className="p-3">{call.lead?.name ?? "—"}</td>
              <td className="p-3">{call.agent?.name ?? "—"}</td>
              <td className="p-3 text-center">
                <Badge
                  variant={
                    call.status === "COMPLETED"
                      ? "success"
                      : call.status === "FAILED"
                        ? "destructive"
                        : "warning"
                  }
                >
                  {call.status}
                </Badge>
              </td>
              <td className="p-3 text-center">
                {call.duration ? `${Math.round(call.duration / 60)}m` : "—"}
              </td>
              <td className="p-3 text-muted-foreground">
                {new Date(call.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
