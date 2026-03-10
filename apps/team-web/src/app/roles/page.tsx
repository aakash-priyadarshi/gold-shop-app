"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { employeeApi } from "@/lib/api";
import { Loader2, Plus, Save, Shield, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const ROLES = [
  "ADMIN",
  "MANAGER",
  "TEAM_LEAD",
  "AGENT",
  "INTERN",
  "SALES",
  "SUPPORT",
  "CRAFTSMAN",
  "DELIVERY",
];

const MODULES = [
  "employees",
  "departments",
  "attendance",
  "leaves",
  "payroll",
  "tasks",
  "ai_agents",
  "certificates",
  "social",
  "reviews",
  "support",
  "settings",
  "kpi",
  "documents",
  "activity_logs",
];

const PERMISSION_KEYS = [
  "canView",
  "canCreate",
  "canEdit",
  "canDelete",
  "canApprove",
  "canExport",
] as const;

type PermRow = {
  id?: string;
  role: string;
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
};

export default function RolesPage() {
  const [selectedRole, setSelectedRole] = useState("ADMIN");
  const [permissions, setPermissions] = useState<PermRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newModule, setNewModule] = useState("");

  const loadPerms = async (role: string) => {
    setLoading(true);
    try {
      const res = await employeeApi.getPermissionsForRole(role);
      const data: PermRow[] = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      // Ensure all standard modules are shown, supplement with any DB entries
      const merged: PermRow[] = MODULES.map((mod) => {
        const existing = data.find((p) => p.module === mod);
        return existing ?? { role, module: mod, canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canExport: false };
      });
      // Include any custom modules from DB not in our MODULES list
      data.filter((p) => !MODULES.includes(p.module)).forEach((p) => merged.push(p));
      setPermissions(merged);
    } catch {
      toast.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerms(selectedRole);
  }, [selectedRole]);

  const toggle = (module: string, key: typeof PERMISSION_KEYS[number]) => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.module === module ? { ...p, [key]: !p[key] } : p
      )
    );
  };

  const toggleAll = (module: string, value: boolean) => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.module === module
          ? { ...p, canView: value, canCreate: value, canEdit: value, canDelete: value, canApprove: value, canExport: value }
          : p
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = permissions.map((p) => ({
        role: selectedRole,
        module: p.module,
        canView: p.canView,
        canCreate: p.canCreate,
        canEdit: p.canEdit,
        canDelete: p.canDelete,
        canApprove: p.canApprove,
        canExport: p.canExport,
      }));
      await employeeApi.bulkUpsertRolePermissions(payload);
      toast.success(`Permissions saved for ${selectedRole.replace(/_/g, " ")}`);
    } catch {
      toast.error("Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  const addModule = () => {
    const mod = newModule.trim().toLowerCase().replace(/\s+/g, "_");
    if (!mod) return;
    if (permissions.find((p) => p.module === mod)) {
      toast.error("Module already exists");
      return;
    }
    setPermissions((prev) => [
      ...prev,
      { role: selectedRole, module: mod, canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canExport: false },
    ]);
    setNewModule("");
  };

  const removeModule = (module: string) => {
    setPermissions((prev) => prev.filter((p) => p.module !== module));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground">Manage access control per role</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label className="text-sm">Select Role</Label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2">
          <div>
            <Label className="text-sm">Add Custom Module</Label>
            <Input placeholder="e.g. inventory" value={newModule} onChange={(e) => setNewModule(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addModule()} />
          </div>
          <Button variant="outline" size="icon" onClick={addModule}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left w-[200px]">Module</th>
                    <th className="p-3 text-center">View</th>
                    <th className="p-3 text-center">Create</th>
                    <th className="p-3 text-center">Edit</th>
                    <th className="p-3 text-center">Delete</th>
                    <th className="p-3 text-center">Approve</th>
                    <th className="p-3 text-center">Export</th>
                    <th className="p-3 text-center w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((perm) => {
                    const allChecked = PERMISSION_KEYS.every((k) => perm[k]);
                    return (
                      <tr key={perm.module} className="border-b hover:bg-muted/30">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium capitalize">{perm.module.replace(/_/g, " ")}</span>
                          </div>
                        </td>
                        {PERMISSION_KEYS.map((key) => (
                          <td key={key} className="p-3 text-center">
                            <Checkbox
                              checked={perm[key]}
                              onCheckedChange={() => toggle(perm.module, key)}
                            />
                          </td>
                        ))}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => toggleAll(perm.module, !allChecked)}
                            >
                              {allChecked ? "None" : "All"}
                            </Button>
                            {!MODULES.includes(perm.module) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => removeModule(perm.module)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Permission Summary — {selectedRole.replace(/_/g, " ")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {permissions.filter((p) => PERMISSION_KEYS.some((k) => p[k])).map((p) => (
              <Badge key={p.module} variant="outline" className="capitalize">
                {p.module.replace(/_/g, " ")} ({PERMISSION_KEYS.filter((k) => p[k]).length}/6)
              </Badge>
            ))}
            {permissions.filter((p) => PERMISSION_KEYS.some((k) => p[k])).length === 0 && (
              <p className="text-muted-foreground text-sm">No permissions assigned for this role</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
