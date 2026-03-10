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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { taskApi } from "@/lib/api";
import { Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const STATUS_COLS = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};
const STATUS_COLORS: Record<string, string> = {
  TODO: "secondary",
  IN_PROGRESS: "warning",
  IN_REVIEW: "default",
  DONE: "success",
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: "secondary",
  MEDIUM: "warning",
  HIGH: "destructive",
  URGENT: "destructive",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [kanban, setKanban] = useState<Record<string, any[]>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    assigneeId: "",
    dueDate: "",
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      taskApi.list(search ? { search } : undefined),
      taskApi.getKanban(),
    ])
      .then(([listRes, kanbanRes]) => {
        setTasks(
          Array.isArray(listRes.data)
            ? listRes.data
            : (listRes.data?.data ?? []),
        );
        setKanban(kanbanRes.data ?? {});
      })
      .catch(() => toast.error("Failed to load tasks"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [search]);

  const handleCreate = async () => {
    try {
      const payload: Record<string, any> = { ...form };
      if (!payload.assigneeId) delete payload.assigneeId;
      if (payload.dueDate) payload.dueDate = new Date(payload.dueDate).toISOString();
      else delete payload.dueDate;
      await taskApi.create(payload);
      toast.success("Task created");
      setShowAdd(false);
      setForm({
        title: "",
        description: "",
        priority: "MEDIUM",
        assigneeId: "",
        dueDate: "",
      });
      load();
    } catch {
      toast.error("Failed to create task");
    }
  };

  const moveTask = async (taskId: string, newStatus: string) => {
    try {
      await taskApi.update(taskId, { status: newStatus });
      load();
    } catch {
      toast.error("Failed to update task");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Manage and track team tasks</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
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
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm({ ...form, dueDate: e.target.value })
                    }
                  />
                </div>
              </div>
              <Button onClick={handleCreate}>Create Task</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {STATUS_COLS.map((status) => {
              const colTasks =
                kanban[status] ?? tasks.filter((t: any) => t.status === status);
              return (
                <div key={status} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">
                      {STATUS_LABELS[status]}
                    </h3>
                    <Badge variant={STATUS_COLORS[status] as any}>
                      {colTasks.length}
                    </Badge>
                  </div>
                  <div className="space-y-2 min-h-[200px] rounded-lg bg-muted/30 p-2">
                    {colTasks.map((task: any) => (
                      <Card
                        key={task.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm leading-tight">
                              {task.title}
                            </p>
                            <Badge
                              variant={PRIORITY_COLORS[task.priority] as any}
                              className="shrink-0 text-[10px]"
                            >
                              {task.priority}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {task.assignee
                                ? `${task.assignee.firstName} ${task.assignee.lastName?.[0]}.`
                                : "Unassigned"}
                            </span>
                            {task.dueDate && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {status !== "DONE" && (
                            <div className="flex gap-1 mt-2">
                              {STATUS_COLS.filter((s) => s !== status).map(
                                (s) => (
                                  <Button
                                    key={s}
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-2"
                                    onClick={() => moveTask(task.id, s)}
                                  >
                                    → {STATUS_LABELS[s]}
                                  </Button>
                                ),
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left">Task</th>
                  <th className="p-3 text-left">Assignee</th>
                  <th className="p-3 text-center">Priority</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-left">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task: any) => (
                  <tr key={task.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 font-medium">{task.title}</td>
                    <td className="p-3 text-muted-foreground">
                      {task.assignee
                        ? `${task.assignee.firstName} ${task.assignee.lastName}`
                        : "—"}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={PRIORITY_COLORS[task.priority] as any}>
                        {task.priority}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={STATUS_COLORS[task.status] as any}>
                        {STATUS_LABELS[task.status] ?? task.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
