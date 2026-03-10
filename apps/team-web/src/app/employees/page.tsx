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
import { employeeApi } from "@/lib/api";
import { Plus, Search, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "SALES",
    departmentId: "",
    baseSalary: "",
  });

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (filterDept) params.departmentId = filterDept;
    Promise.all([employeeApi.list(params), employeeApi.listDepartments()])
      .then(([empRes, deptRes]) => {
        setEmployees(
          Array.isArray(empRes.data) ? empRes.data : (empRes.data?.data ?? []),
        );
        setDepartments(
          Array.isArray(deptRes.data)
            ? deptRes.data
            : (deptRes.data?.data ?? []),
        );
      })
      .catch(() => toast.error("Failed to load employees"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [search, filterDept]);

  const handleCreate = async () => {
    try {
      await employeeApi.create({
        ...form,
        baseSalary: form.baseSalary ? parseFloat(form.baseSalary) : undefined,
      });
      toast.success("Employee created");
      setShowAdd(false);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        role: "SALES",
        departmentId: "",
        baseSalary: "",
      });
      load();
    } catch {
      toast.error("Failed to create employee");
    }
  };

  const handleTerminate = async (id: string) => {
    if (!confirm("Are you sure you want to terminate this employee?")) return;
    try {
      await employeeApi.terminate(id);
      toast.success("Employee terminated");
      load();
    } catch {
      toast.error("Failed to terminate employee");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">Manage your team members</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => setForm({ ...form, role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "SALES",
                        "SUPPORT",
                        "MANAGER",
                        "ADMIN",
                        "CRAFTSMAN",
                        "DELIVERY",
                      ].map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Department</Label>
                  <Select
                    value={form.departmentId}
                    onValueChange={(v) => setForm({ ...form, departmentId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Base Salary</Label>
                <Input
                  type="number"
                  value={form.baseSalary}
                  onChange={(e) =>
                    setForm({ ...form, baseSalary: e.target.value })
                  }
                />
              </div>
              <Button onClick={handleCreate}>Create Employee</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leaves">Leave Requests</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                {departments.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="h-24 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : employees.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No employees yet</h3>
                <p className="text-muted-foreground mt-1">
                  Add your first team member to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {employees.map((emp: any) => (
                <Card key={emp.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-100 dark:bg-gold-900 text-gold-600 dark:text-gold-400 font-semibold text-sm">
                          {emp.firstName?.[0]}
                          {emp.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {emp.email}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          emp.isActive !== false ? "success" : "destructive"
                        }
                      >
                        {emp.isActive !== false ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{emp.role}</span>
                      <span className="text-muted-foreground">
                        {emp.department?.name ?? "—"}
                      </span>
                    </div>
                    {emp.isActive !== false && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-destructive"
                        onClick={() => handleTerminate(emp.id)}
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Terminate
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceTab />
        </TabsContent>

        <TabsContent value="leaves">
          <LeavesTab />
        </TabsContent>

        <TabsContent value="payroll">
          <PayrollTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AttendanceTab() {
  const [summary, setSummary] = useState<any>(null);
  useEffect(() => {
    employeeApi
      .getAttendanceSummary()
      .then((res) => setSummary(res.data))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          {summary ? (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-emerald-500">
                  {summary.present ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">Present</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-500">
                  {summary.late ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">Late</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">
                  {summary.absent ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">Absent</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No attendance data available
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LeavesTab() {
  const [leaves, setLeaves] = useState<any[]>([]);
  useEffect(() => {
    employeeApi
      .listLeaves()
      .then((res) => {
        setLeaves(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
      })
      .catch(() => {});
  }, []);

  const handleApprove = async (id: string) => {
    await employeeApi.approveLeave(id);
    toast.success("Leave approved");
    employeeApi
      .listLeaves()
      .then((res) =>
        setLeaves(Array.isArray(res.data) ? res.data : (res.data?.data ?? [])),
      );
  };

  const handleReject = async (id: string) => {
    await employeeApi.rejectLeave(id);
    toast.success("Leave rejected");
    employeeApi
      .listLeaves()
      .then((res) =>
        setLeaves(Array.isArray(res.data) ? res.data : (res.data?.data ?? [])),
      );
  };

  return (
    <div className="space-y-4">
      {leaves.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No leave requests
          </CardContent>
        </Card>
      ) : (
        leaves.map((l: any) => (
          <Card key={l.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {l.employee?.firstName} {l.employee?.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {l.type} — {l.startDate} to {l.endDate}
                </p>
                {l.reason && <p className="text-sm mt-1">{l.reason}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    l.status === "APPROVED"
                      ? "success"
                      : l.status === "REJECTED"
                        ? "destructive"
                        : "warning"
                  }
                >
                  {l.status}
                </Badge>
                {l.status === "PENDING" && (
                  <>
                    <Button size="sm" onClick={() => handleApprove(l.id)}>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(l.id)}
                    >
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function PayrollTab() {
  const [payroll, setPayroll] = useState<any[]>([]);
  const now = new Date();

  useEffect(() => {
    employeeApi
      .getPayroll(now.getMonth() + 1, now.getFullYear())
      .then((res) => {
        setPayroll(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      {payroll.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No payroll records this month
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left">Employee</th>
                <th className="p-3 text-right">Base</th>
                <th className="p-3 text-right">Bonus</th>
                <th className="p-3 text-right">Deductions</th>
                <th className="p-3 text-right">Net Pay</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {payroll.map((p: any) => (
                <tr key={p.id} className="border-b">
                  <td className="p-3">
                    {p.employee?.firstName} {p.employee?.lastName}
                  </td>
                  <td className="p-3 text-right">
                    {p.baseSalary?.toLocaleString()}
                  </td>
                  <td className="p-3 text-right">
                    {p.bonus?.toLocaleString() ?? 0}
                  </td>
                  <td className="p-3 text-right">
                    {p.deductions?.toLocaleString() ?? 0}
                  </td>
                  <td className="p-3 text-right font-semibold">
                    {p.netPay?.toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    <Badge
                      variant={p.status === "PAID" ? "success" : "warning"}
                    >
                      {p.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Users(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
