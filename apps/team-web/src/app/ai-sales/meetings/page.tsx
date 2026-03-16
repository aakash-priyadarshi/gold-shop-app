"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { aiSalesApi } from "@/lib/api";
import {
    Calendar,
    Clock,
    ExternalLink,
    Play,
    Plus,
    Video,
    X
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DailyMeeting } from "@/components/DailyMeeting";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  reminder_sent: "bg-yellow-100 text-yellow-800",
  launching: "bg-orange-100 text-orange-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-pink-100 text-pink-800",
  error: "bg-red-100 text-red-800",
};

const BRAND_COLORS = {
  accent: "#C9A227",
  background: "#1a1a2e",
  text: "#f8fafc",
};

const BRAND_LOGO = "https://www.orivraa.com/brand/orivraa-logo.svg";

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [joinModal, setJoinModal] = useState({ open: false, url: "", token: "" });

  // Schedule form state
  const [form, setForm] = useState({
    leadId: "",
    agentId: "",
    scheduledAt: "",
    title: "",
    type: "daily" as "daily" | "external",
    externalMeetUrl: "",
  });

  const fetchData = async () => {
    setLoading(true);
    const [meetRes, agentRes, leadRes] = await Promise.allSettled([
      aiSalesApi.listMeetings(filter !== "all" ? { status: filter } : {}),
      aiSalesApi.listAgents(),
      aiSalesApi.listLeads(),
    ]);
    setMeetings(
      meetRes.status === "fulfilled"
        ? Array.isArray(meetRes.value.data)
          ? meetRes.value.data
          : meetRes.value.data?.data ?? []
        : [],
    );
    setAgents(
      agentRes.status === "fulfilled"
        ? Array.isArray(agentRes.value.data)
          ? agentRes.value.data
          : agentRes.value.data?.data ?? []
        : [],
    );
    setLeads(
      leadRes.status === "fulfilled"
        ? Array.isArray(leadRes.value.data)
          ? leadRes.value.data
          : leadRes.value.data?.data ?? []
        : [],
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [filter]);

  const handleSchedule = async () => {
    if (!form.agentId || !form.scheduledAt) {
      toast.error("Agent and scheduled time are required");
      return;
    }
    if (form.type === "external" && !form.externalMeetUrl) {
      toast.error("External meeting URL is required");
      return;
    }
    try {
      await aiSalesApi.scheduleMeeting({
        leadId: form.leadId || undefined,
        agentId: form.agentId,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        title: form.title || undefined,
        type: form.type,
        externalMeetUrl: form.type === "external" ? form.externalMeetUrl : undefined,
      });
      toast.success("Meeting scheduled!");
      setDialogOpen(false);
      setForm({ leadId: "", agentId: "", scheduledAt: "", title: "", type: "daily", externalMeetUrl: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to schedule meeting");
    }
  };

  const handleLaunch = async (id: string) => {
    try {
      await aiSalesApi.launchMeeting(id);
      toast.success("Agent launched into meeting!");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to launch");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await aiSalesApi.cancelMeeting(id);
      toast.success("Meeting cancelled");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to cancel");
    }
  };

  const viewDetails = async (id: string) => {
    try {
      const res = await aiSalesApi.getMeeting(id);
      setSelectedMeeting(res.data);
    } catch {
      toast.error("Failed to load meeting details");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
          <p className="text-muted-foreground">
            Schedule and manage AI-powered video meetings with leads
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Schedule Meeting
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule a Meeting</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label>Meeting Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily.co Room (AI creates)</SelectItem>
                    <SelectItem value="external">External Link (Google Meet / Zoom)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Agent *</Label>
                <Select value={form.agentId} onValueChange={(v) => setForm({ ...form, agentId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                  <SelectContent>
                    {agents.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lead (optional)</Label>
                <Select value={form.leadId} onValueChange={(v) => setForm({ ...form, leadId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select lead" /></SelectTrigger>
                  <SelectContent>
                    {leads.map((l: any) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}{l.email ? ` (${l.email})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Scheduled Time *</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                />
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Sales discussion"
                />
              </div>
              {form.type === "external" && (
                <div>
                  <Label>Meeting URL *</Label>
                  <Input
                    value={form.externalMeetUrl}
                    onChange={(e) => setForm({ ...form, externalMeetUrl: e.target.value })}
                    placeholder="https://meet.google.com/abc-def-ghi"
                  />
                </div>
              )}
              <Button onClick={handleSchedule}>Schedule</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "scheduled", "active", "completed", "cancelled", "no_show"].map((s) => (
          <Button
            key={s}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "All" : s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </Button>
        ))}
      </div>

      {/* Meetings List */}
      {loading ? (
        <p className="text-muted-foreground">Loading meetings...</p>
      ) : meetings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Video className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No meetings found</p>
            <p className="text-muted-foreground">Schedule a meeting to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {meetings.map((m: any) => (
            <Card key={m.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold">{m.title || "Meeting"}</h3>
                      <Badge className={statusColors[m.status] || "bg-gray-100"}>
                        {m.status}
                      </Badge>
                      <Badge variant="outline">
                        {m.type === "daily" ? "Daily.co" : "External"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {m.lead && (
                        <span className="flex items-center gap-1">
                          👤 {m.lead.name}
                        </span>
                      )}
                      {m.agent && (
                        <span className="flex items-center gap-1">
                          🤖 {m.agent.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(m.scheduledAt).toLocaleString()}
                      </span>
                      {m.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.floor(m.duration / 60)}m {m.duration % 60}s
                        </span>
                      )}
                    </div>
                    {m.summary && (
                      <p className="text-sm mt-2 text-muted-foreground line-clamp-2">{m.summary}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                      {m.dailyRoomUrl && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-[#C9A227] text-[#C9A227] hover:bg-[#C9A227] hover:text-white"
                          onClick={() => setJoinModal({ open: true, url: m.dailyRoomUrl, token: m.dailyRoomToken || "" })}
                        >
                          <Video className="h-3 w-3 mr-1" /> Join Branded
                        </Button>
                      )}
                    {["scheduled", "reminder_sent"].includes(m.status) && m.type === "daily" && (
                      <Button variant="outline" size="sm" onClick={() => handleLaunch(m.id)}>
                        <Play className="h-3 w-3 mr-1" /> Launch
                      </Button>
                    )}
                    {!["completed", "cancelled", "no_show"].includes(m.status) && (
                      <Button variant="destructive" size="sm" onClick={() => handleCancel(m.id)}>
                        <X className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => viewDetails(m.id)}>
                      Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Meeting Detail Dialog */}
      {selectedMeeting && (
        <Dialog open={!!selectedMeeting} onOpenChange={() => setSelectedMeeting(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedMeeting.title || "Meeting Details"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Status:</span>{" "}
                  <Badge className={statusColors[selectedMeeting.status]}>{selectedMeeting.status}</Badge>
                </div>
                <div>
                  <span className="font-medium">Type:</span>{" "}
                  {selectedMeeting.type === "daily" ? "Daily.co" : "External"}
                </div>
                <div>
                  <span className="font-medium">Scheduled:</span>{" "}
                  {new Date(selectedMeeting.scheduledAt).toLocaleString()}
                </div>
                {selectedMeeting.duration && (
                  <div>
                    <span className="font-medium">Duration:</span>{" "}
                    {Math.floor(selectedMeeting.duration / 60)}m {selectedMeeting.duration % 60}s
                  </div>
                )}
                {selectedMeeting.lead && (
                  <div>
                    <span className="font-medium">Lead:</span>{" "}
                    <Link href={`/ai-sales/leads`} className="text-blue-600 hover:underline">
                      {selectedMeeting.lead.name}
                    </Link>
                  </div>
                )}
                {selectedMeeting.agent && (
                  <div><span className="font-medium">Agent:</span> {selectedMeeting.agent.name}</div>
                )}
              </div>

              {selectedMeeting.dailyRoomUrl && (
                <div>
                  <span className="font-medium text-sm">Branded Room URL:</span>
                  <Button
                    variant="link"
                    className="text-[#C9A227] h-auto p-0 ml-2 hover:underline font-medium"
                    onClick={() => setJoinModal({ open: true, url: selectedMeeting.dailyRoomUrl, token: selectedMeeting.dailyRoomToken || "" })}
                  >
                    Open Orivraa Meeting Room
                  </Button>
                </div>
              )}

              {selectedMeeting.summary && (
                <div>
                  <h4 className="font-medium mb-1">Summary</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line bg-muted/50 p-3 rounded">
                    {selectedMeeting.summary}
                  </p>
                </div>
              )}

              {selectedMeeting.actionItems && Array.isArray(selectedMeeting.actionItems) && selectedMeeting.actionItems.length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">Action Items</h4>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    {selectedMeeting.actionItems.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedMeeting.transcript && (
                <div>
                  <h4 className="font-medium mb-1">Transcript</h4>
                  <div className="text-sm bg-muted/50 p-3 rounded max-h-60 overflow-y-auto whitespace-pre-line">
                    {selectedMeeting.transcript}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
      {joinModal.open && (
        <DailyMeeting
          url={joinModal.url}
          token={joinModal.token || undefined}
          userName="Orivraa User"
          onClose={() => setJoinModal({ open: false, url: "", token: "" })}
        />
      )}
    </div>
  );
}
