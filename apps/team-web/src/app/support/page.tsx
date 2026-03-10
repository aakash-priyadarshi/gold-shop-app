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
import { supportApi } from "@/lib/api";
import { BookOpen, Plus, Search, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "warning",
  IN_PROGRESS: "default",
  WAITING: "secondary",
  RESOLVED: "success",
  CLOSED: "secondary",
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: "secondary",
  MEDIUM: "warning",
  HIGH: "destructive",
  URGENT: "destructive",
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    description: "",
    priority: "MEDIUM",
    channel: "EMAIL",
    customerName: "",
    customerEmail: "",
  });

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    Promise.allSettled([
      supportApi.listTickets(params),
      supportApi.getDashboard(),
    ]).then(([ticketRes, dashRes]) => {
      setTickets(
        ticketRes.status === "fulfilled"
          ? Array.isArray(ticketRes.value.data)
            ? ticketRes.value.data
            : (ticketRes.value.data?.data ?? [])
          : [],
      );
      setDashboard(dashRes.status === "fulfilled" ? dashRes.value.data : null);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, [search, statusFilter]);

  const handleCreate = async () => {
    try {
      await supportApi.createTicket(form);
      toast.success("Ticket created");
      setShowCreate(false);
      setForm({
        subject: "",
        description: "",
        priority: "MEDIUM",
        channel: "EMAIL",
        customerName: "",
        customerEmail: "",
      });
      load();
    } catch {
      toast.error("Failed to create ticket");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support & CRM</h1>
          <p className="text-muted-foreground">
            Customer support tickets and knowledge base
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Ticket</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label>Subject</Label>
                <Input
                  value={form.subject}
                  onChange={(e) =>
                    setForm({ ...form, subject: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer Name</Label>
                  <Input
                    value={form.customerName}
                    onChange={(e) =>
                      setForm({ ...form, customerName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Customer Email</Label>
                  <Input
                    type="email"
                    value={form.customerEmail}
                    onChange={(e) =>
                      setForm({ ...form, customerEmail: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => setForm({ ...form, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Channel</Label>
                  <Select
                    value={form.channel}
                    onValueChange={(v) => setForm({ ...form, channel: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["EMAIL", "PHONE", "CHAT", "SOCIAL", "WALK_IN"].map(
                        (c) => (
                          <SelectItem key={c} value={c}>
                            {c.replace(/_/g, " ")}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreate}>Create Ticket</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dashboard stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-500">
              {dashboard?.openTickets ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Resolved Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-500">
              {dashboard?.resolvedToday ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {dashboard?.avgResponseTime ?? "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {dashboard?.satisfaction ?? "—"}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tickets">
        <TabsList>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
          <TabsTrigger value="canned">Canned Responses</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                {["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"].map(
                  (s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          {tickets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No tickets found
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket: any) => (
                <Card
                  key={ticket.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{ticket.subject}</p>
                          <Badge
                            variant={PRIORITY_COLORS[ticket.priority] as any}
                          >
                            {ticket.priority}
                          </Badge>
                        </div>
                        {ticket.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {ticket.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>
                            {ticket.customerName ??
                              ticket.customerEmail ??
                              "Unknown"}
                          </span>
                          <span>{ticket.channel}</span>
                          <span>
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </span>
                          {ticket.assignee && (
                            <span>
                              → {ticket.assignee.firstName}{" "}
                              {ticket.assignee.lastName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge variant={STATUS_COLORS[ticket.status] as any}>
                          {ticket.status?.replace(/_/g, " ")}
                        </Badge>
                        <div className="flex gap-1">
                          {ticket.status === "OPEN" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={async () => {
                                await supportApi.resolveTicket(ticket.id);
                                load();
                              }}
                            >
                              Resolve
                            </Button>
                          )}
                          {ticket.status === "RESOLVED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={async () => {
                                await supportApi.closeTicket(ticket.id);
                                load();
                              }}
                            >
                              Close
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="knowledge">
          <KnowledgeTab />
        </TabsContent>

        <TabsContent value="canned">
          <CannedTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KnowledgeTab() {
  const [articles, setArticles] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supportApi
      .listArticles(search ? { search } : undefined)
      .then((res) => {
        setArticles(
          Array.isArray(res.data) ? res.data : (res.data?.data ?? []),
        );
      })
      .catch(() => {});
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search articles..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {articles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            No articles found
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {articles.map((article: any) => (
            <Card key={article.id}>
              <CardContent className="p-4">
                <p className="font-semibold">{article.title}</p>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {article.content}
                </p>
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <Badge variant="outline">
                    {article.category ?? "General"}
                  </Badge>
                  <span>{article.viewCount ?? 0} views</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CannedTab() {
  const [responses, setResponses] = useState<any[]>([]);

  useEffect(() => {
    supportApi
      .listCannedResponses()
      .then((res) => {
        setResponses(
          Array.isArray(res.data) ? res.data : (res.data?.data ?? []),
        );
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      {responses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center">
            <Zap className="h-12 w-12 text-muted-foreground mb-4" />
            No canned responses
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {responses.map((resp: any) => (
            <Card key={resp.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{resp.title}</p>
                  <Badge variant="outline">{resp.category ?? "General"}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                  {resp.content}
                </p>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>Used {resp.useCount ?? 0} times</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
