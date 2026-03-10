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
import { employeeApi } from "@/lib/api";
import { Building2, Edit, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editDept, setEditDept] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const load = () => {
    setLoading(true);
    employeeApi
      .listDepartments()
      .then((res) => {
        setDepartments(
          Array.isArray(res.data) ? res.data : (res.data?.data ?? []),
        );
      })
      .catch(() => toast.error("Failed to load departments"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error("Department name is required");
    try {
      await employeeApi.createDepartment({ name: form.name, description: form.description || undefined });
      toast.success("Department created");
      setShowAdd(false);
      setForm({ name: "", description: "" });
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to create department");
    }
  };

  const handleUpdate = async () => {
    if (!editDept || !form.name.trim()) return;
    try {
      await employeeApi.updateDepartment(editDept.id, { name: form.name, description: form.description || undefined });
      toast.success("Department updated");
      setEditDept(null);
      setForm({ name: "", description: "" });
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to update department");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete department "${name}"? Employees must be reassigned first.`)) return;
    try {
      await employeeApi.deleteDepartment(id);
      toast.success("Department deactivated");
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to delete department");
    }
  };

  const openEdit = (dept: any) => {
    setEditDept(dept);
    setForm({ name: dept.name, description: dept.description || "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground">Manage organizational structure</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Department</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label>Name</Label>
                <Input
                  placeholder="e.g. Sales, Operations, HR"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  placeholder="Brief description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <Button onClick={handleCreate}>Create Department</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editDept} onOpenChange={(o) => { if (!o) { setEditDept(null); setForm({ name: "", description: "" }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <Button onClick={handleUpdate}>Update Department</Button>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-20 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : departments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No departments yet</h3>
            <p className="text-muted-foreground mt-1">Create your first department to organize your team.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept: any) => (
            <Card key={dept.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold-100 dark:bg-gold-900 text-gold-600 dark:text-gold-400">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{dept.name}</CardTitle>
                      {dept.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{dept.description}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline">{dept.isActive ? "Active" : "Inactive"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{dept._count?.employees ?? 0} members</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(dept)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(dept.id, dept.name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
