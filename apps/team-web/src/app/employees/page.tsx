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
import { Edit, Eye, Plus, Search, UserX } from "lucide-react";
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

const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERN_TYPE",
  "PROBATION",
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const DEFAULT_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "AGENT",
  departmentId: "",
  jobTitle: "",
  salary: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyRelation: "",
  panNumber: "",
  aadhaarLast4: "",
  bloodGroup: "",
  maritalStatus: "",
  nationality: "Indian",
  bankAccountNo: "",
  bankName: "",
  bankIfsc: "",
  bankBranch: "",
  employmentType: "FULL_TIME",
  shiftTiming: "",
  reportingToId: "",
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("__all__");
  const [filterRole, setFilterRole] = useState("__all__");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [viewEmp, setViewEmp] = useState<any>(null);
  const [editEmp, setEditEmp] = useState<any>(null);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [formTab, setFormTab] = useState("basic");

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (filterDept && filterDept !== "__all__") params.departmentId = filterDept;
    if (filterRole && filterRole !== "__all__") params.role = filterRole;
    Promise.all([employeeApi.list(params), employeeApi.listDepartments()])
      .then(([empRes, deptRes]) => {
        setEmployees(Array.isArray(empRes.data) ? empRes.data : (empRes.data?.data ?? []));
        setDepartments(Array.isArray(deptRes.data) ? deptRes.data : (deptRes.data?.data ?? []));
      })
      .catch(() => toast.error("Failed to load employees"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, filterDept, filterRole]);

  const handleCreate = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.departmentId) {
      return toast.error("First name, last name, email, and department are required");
    }
    try {
      const payload: Record<string, any> = { ...form };
      if (payload.salary) payload.salary = parseFloat(payload.salary);
      else delete payload.salary;
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") delete payload[k];
      });
      await employeeApi.create(payload);
      toast.success("Employee created — welcome email sent!");
      setShowAdd(false);
      setForm({ ...DEFAULT_FORM });
      setFormTab("basic");
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to create employee");
    }
  };

  const handleUpdate = async () => {
    if (!editEmp) return;
    try {
      const payload: Record<string, any> = { ...form };
      if (payload.salary) payload.salary = parseFloat(payload.salary);
      else delete payload.salary;
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") delete payload[k];
      });
      await employeeApi.update(editEmp.id, payload);
      toast.success("Employee updated");
      setEditEmp(null);
      setForm({ ...DEFAULT_FORM });
      setFormTab("basic");
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to update employee");
    }
  };

  const handleTerminate = async (id: string) => {
    const reason = prompt("Termination reason (optional):");
    if (reason === null) return;
    try {
      await employeeApi.terminate(id, reason || undefined);
      toast.success("Employee terminated");
      load();
    } catch {
      toast.error("Failed to terminate employee");
    }
  };

  const openView = async (id: string) => {
    try {
      const res = await employeeApi.getById(id);
      setViewEmp(res.data);
    } catch {
      toast.error("Failed to load employee details");
    }
  };

  const openEdit = (emp: any) => {
    setEditEmp(emp);
    setForm({
      firstName: emp.firstName || "",
      lastName: emp.lastName || "",
      email: emp.email || "",
      phone: emp.phone || "",
      role: emp.role || "AGENT",
      departmentId: emp.departmentId || "",
      jobTitle: emp.jobTitle || "",
      salary: emp.salary?.toString() || "",
      dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.split("T")[0] : "",
      gender: emp.gender || "",
      address: emp.address || "",
      city: emp.city || "",
      state: emp.state || "",
      pincode: emp.pincode || "",
      country: emp.country || "India",
      emergencyContactName: emp.emergencyContactName || "",
      emergencyContactPhone: emp.emergencyContactPhone || "",
      emergencyRelation: emp.emergencyRelation || "",
      panNumber: emp.panNumber || "",
      aadhaarLast4: emp.aadhaarLast4 || "",
      bloodGroup: emp.bloodGroup || "",
      maritalStatus: emp.maritalStatus || "",
      nationality: emp.nationality || "Indian",
      bankAccountNo: emp.bankAccountNo || "",
      bankName: emp.bankName || "",
      bankIfsc: emp.bankIfsc || "",
      bankBranch: emp.bankBranch || "",
      employmentType: emp.employmentType || "FULL_TIME",
      shiftTiming: emp.shiftTiming || "",
      reportingToId: emp.reportingToId || "",
    });
    setFormTab("basic");
  };

  const EmployeeFormContent = ({ isEdit }: { isEdit: boolean }) => (
    <div className="space-y-4">
      <Tabs value={formTab} onValueChange={setFormTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="bank">Bank & ID</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Job Title</Label>
              <Input placeholder="e.g. Senior Developer" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Department *</Label>
              <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Base Salary (INR)</Label>
            <Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
          </div>
        </TabsContent>

        <TabsContent value="personal" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender || "__none__"} onValueChange={(v) => setForm({ ...form, gender: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not specified</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Blood Group</Label>
              <Select value={form.bloodGroup || "__none__"} onValueChange={(v) => setForm({ ...form, bloodGroup: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not specified</SelectItem>
                  {BLOOD_GROUPS.map((bg) => (
                    <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Marital Status</Label>
              <Select value={form.maritalStatus || "__none__"} onValueChange={(v) => setForm({ ...form, maritalStatus: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not specified</SelectItem>
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Married">Married</SelectItem>
                  <SelectItem value="Divorced">Divorced</SelectItem>
                  <SelectItem value="Widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>State</Label>
              <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div>
              <Label>Pincode</Label>
              <Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
            </div>
          </div>
          <h4 className="font-semibold text-sm text-muted-foreground pt-2">Emergency Contact</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Name</Label>
              <Input value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.emergencyContactPhone} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} />
            </div>
            <div>
              <Label>Relation</Label>
              <Input placeholder="e.g. Father, Spouse" value={form.emergencyRelation} onChange={(e) => setForm({ ...form, emergencyRelation: e.target.value })} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="employment" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Employment Type</Label>
              <Select value={form.employmentType} onValueChange={(v) => setForm({ ...form, employmentType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shift Timing</Label>
              <Input placeholder="e.g. 09:00-18:00" value={form.shiftTiming} onChange={(e) => setForm({ ...form, shiftTiming: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Reporting To</Label>
            <Select value={form.reportingToId || "__none__"} onValueChange={(v) => setForm({ ...form, reportingToId: v === "__none__" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {employees.filter((e) => ["ADMIN", "MANAGER", "TEAM_LEAD"].includes(e.role)).map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nationality</Label>
            <Input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
          </div>
        </TabsContent>

        <TabsContent value="bank" className="space-y-4 mt-4">
          <h4 className="font-semibold text-sm text-muted-foreground">Bank Details</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Bank Name</Label>
              <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
            </div>
            <div>
              <Label>Branch</Label>
              <Input value={form.bankBranch} onChange={(e) => setForm({ ...form, bankBranch: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Account Number</Label>
              <Input value={form.bankAccountNo} onChange={(e) => setForm({ ...form, bankAccountNo: e.target.value })} />
            </div>
            <div>
              <Label>IFSC Code</Label>
              <Input value={form.bankIfsc} onChange={(e) => setForm({ ...form, bankIfsc: e.target.value })} />
            </div>
          </div>
          <h4 className="font-semibold text-sm text-muted-foreground pt-2">Identity Documents</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>PAN Number</Label>
              <Input placeholder="e.g. ABCPD1234E" value={form.panNumber} onChange={(e) => setForm({ ...form, panNumber: e.target.value })} />
            </div>
            <div>
              <Label>Aadhaar (Last 4 digits)</Label>
              <Input maxLength={4} placeholder="e.g. 1234" value={form.aadhaarLast4} onChange={(e) => setForm({ ...form, aadhaarLast4: e.target.value })} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Button className="w-full" onClick={isEdit ? handleUpdate : handleCreate}>
        {isEdit ? "Update Employee" : "Create Employee"}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">Manage your team members</p>
        </div>
        <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) { setForm({ ...DEFAULT_FORM }); setFormTab("basic"); } }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Employee</DialogTitle>
            </DialogHeader>
            <EmployeeFormContent isEdit={false} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editEmp} onOpenChange={(o) => { if (!o) { setEditEmp(null); setForm({ ...DEFAULT_FORM }); setFormTab("basic"); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee — {editEmp?.firstName} {editEmp?.lastName}</DialogTitle>
          </DialogHeader>
          <EmployeeFormContent isEdit={true} />
        </DialogContent>
      </Dialog>

      {/* Profile View Dialog */}
      <Dialog open={!!viewEmp} onOpenChange={(o) => { if (!o) setViewEmp(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employee Profile</DialogTitle>
          </DialogHeader>
          {viewEmp && <EmployeeProfile emp={viewEmp} />}
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leaves">Leave Requests</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search employees..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Depts</SelectItem>
                {departments.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Roles</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}><CardContent className="p-6"><div className="h-24 animate-pulse rounded bg-muted" /></CardContent></Card>
              ))}
            </div>
          ) : employees.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No employees yet</h3>
                <p className="text-muted-foreground mt-1">Add your first team member to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {employees.map((emp: any) => (
                <Card key={emp.id} className="group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-100 dark:bg-gold-900 text-gold-600 dark:text-gold-400 font-semibold text-sm">
                          {emp.firstName?.[0]}{emp.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold">{emp.firstName} {emp.lastName}</p>
                          <p className="text-sm text-muted-foreground">{emp.email}</p>
                          {emp.jobTitle && <p className="text-xs text-muted-foreground">{emp.jobTitle}</p>}
                        </div>
                      </div>
                      <Badge variant={emp.isActive !== false ? "success" : "destructive"}>
                        {emp.isActive !== false ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <Badge variant="outline">{emp.role?.replace(/_/g, " ")}</Badge>
                      <span className="text-muted-foreground">{emp.department?.name ?? "—"}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => openView(emp.id)}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(emp)}>
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      {emp.isActive !== false && (
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleTerminate(emp.id)}>
                          <UserX className="h-4 w-4 mr-1" /> Terminate
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="attendance"><AttendanceTab /></TabsContent>
        <TabsContent value="leaves"><LeavesTab /></TabsContent>
        <TabsContent value="payroll"><PayrollTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Employee Profile Component ─── */

function EmployeeProfile({ emp }: { emp: any }) {
  const Row = ({ label, value }: { label: string; value?: string | null }) => (
    value ? (
      <div className="flex justify-between py-1.5 border-b border-muted last:border-0">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium">{value}</span>
      </div>
    ) : null
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-100 dark:bg-gold-900 text-gold-600 dark:text-gold-400 font-bold text-xl">
          {emp.firstName?.[0]}{emp.lastName?.[0]}
        </div>
        <div>
          <h2 className="text-xl font-bold">{emp.firstName} {emp.lastName}</h2>
          <p className="text-muted-foreground">{emp.jobTitle || emp.role}</p>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline">{emp.employeeCode}</Badge>
            <Badge variant={emp.isActive ? "success" : "destructive"}>{emp.isActive ? "Active" : "Inactive"}</Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Row label="Email" value={emp.email} />
              <Row label="Phone" value={emp.phone} />
              <Row label="Department" value={emp.department?.name} />
              <Row label="Role" value={emp.role?.replace(/_/g, " ")} />
              <Row label="Job Title" value={emp.jobTitle} />
              <Row label="Employee Code" value={emp.employeeCode} />
              <Row label="Joined" value={emp.joinedAt ? new Date(emp.joinedAt).toLocaleDateString() : undefined} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Row label="Date of Birth" value={emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString() : undefined} />
              <Row label="Gender" value={emp.gender} />
              <Row label="Blood Group" value={emp.bloodGroup} />
              <Row label="Marital Status" value={emp.maritalStatus} />
              <Row label="Nationality" value={emp.nationality} />
              <Row label="Address" value={[emp.address, emp.city, emp.state, emp.pincode].filter(Boolean).join(", ") || undefined} />
              <h4 className="font-semibold text-sm mt-4 mb-2">Emergency Contact</h4>
              <Row label="Name" value={emp.emergencyContactName} />
              <Row label="Phone" value={emp.emergencyContactPhone} />
              <Row label="Relation" value={emp.emergencyRelation} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employment" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <Row label="Employment Type" value={emp.employmentType?.replace(/_/g, " ")} />
              <Row label="Salary" value={emp.salary ? `₹${emp.salary.toLocaleString()}` : undefined} />
              <Row label="Shift" value={emp.shiftTiming} />
              <Row label="Bank" value={emp.bankName ? `${emp.bankName} — ${emp.bankBranch || ""}` : undefined} />
              <Row label="Account No" value={emp.bankAccountNo} />
              <Row label="IFSC" value={emp.bankIfsc} />
              <Row label="PAN" value={emp.panNumber} />
              <Row label="Aadhaar (last 4)" value={emp.aadhaarLast4} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records" className="mt-4 space-y-4">
          {emp.leaveRequests?.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Leaves</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                {emp.leaveRequests.map((l: any) => (
                  <div key={l.id} className="flex justify-between py-1.5 border-b last:border-0 text-sm">
                    <span>{l.type} — {new Date(l.startDate).toLocaleDateString()} to {new Date(l.endDate).toLocaleDateString()}</span>
                    <Badge variant={l.status === "APPROVED" ? "success" : l.status === "REJECTED" ? "destructive" : "warning"} className="text-xs">{l.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {emp.payrollRecords?.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Payroll</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                {emp.payrollRecords.map((p: any) => (
                  <div key={p.id} className="flex justify-between py-1.5 border-b last:border-0 text-sm">
                    <span>{p.month}/{p.year}</span>
                    <span className="font-medium">₹{p.netPay?.toLocaleString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {emp.documents?.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Documents</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0">
                {emp.documents.map((d: any) => (
                  <div key={d.id} className="flex justify-between py-1.5 border-b last:border-0 text-sm">
                    <span>{d.name}</span>
                    <Badge variant="outline" className="text-xs">{d.type}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Attendance Tab ─── */

function AttendanceTab() {
  const [summary, setSummary] = useState<any>(null);
  useEffect(() => {
    employeeApi.getAttendanceSummary().then((res) => setSummary(res.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Today&apos;s Attendance</CardTitle></CardHeader>
        <CardContent>
          {summary ? (
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-emerald-500">{summary.present ?? 0}</p>
                <p className="text-sm text-muted-foreground">Present</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">{summary.workFromHome ?? 0}</p>
                <p className="text-sm text-muted-foreground">WFH</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-500">{summary.onLeave ?? 0}</p>
                <p className="text-sm text-muted-foreground">On Leave</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">{summary.absent ?? 0}</p>
                <p className="text-sm text-muted-foreground">Absent</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No attendance data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Leaves Tab ─── */

function LeavesTab() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const loadLeaves = () => {
    employeeApi.listLeaves().then((res) => {
      setLeaves(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
    }).catch(() => {});
  };
  useEffect(() => { loadLeaves(); }, []);

  const handleApprove = async (id: string) => {
    await employeeApi.approveLeave(id);
    toast.success("Leave approved — notification sent");
    loadLeaves();
  };
  const handleReject = async (id: string) => {
    await employeeApi.rejectLeave(id);
    toast.success("Leave rejected");
    loadLeaves();
  };

  return (
    <div className="space-y-4">
      {leaves.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No leave requests</CardContent></Card>
      ) : (
        leaves.map((l: any) => (
          <Card key={l.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{l.employee?.firstName} {l.employee?.lastName}</p>
                <p className="text-sm text-muted-foreground">{l.type} — {new Date(l.startDate).toLocaleDateString()} to {new Date(l.endDate).toLocaleDateString()}</p>
                {l.reason && <p className="text-sm mt-1">{l.reason}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={l.status === "APPROVED" ? "success" : l.status === "REJECTED" ? "destructive" : "warning"}>{l.status}</Badge>
                {l.status === "PENDING" && (
                  <>
                    <Button size="sm" onClick={() => handleApprove(l.id)}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleReject(l.id)}>Reject</Button>
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

/* ─── Payroll Tab ─── */

function PayrollTab() {
  const [payroll, setPayroll] = useState<any[]>([]);
  const now = new Date();
  useEffect(() => {
    employeeApi.getPayroll(now.getMonth() + 1, now.getFullYear()).then((res) => {
      setPayroll(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      {payroll.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No payroll records this month</CardContent></Card>
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
                  <td className="p-3">{p.employee?.firstName} {p.employee?.lastName}</td>
                  <td className="p-3 text-right">₹{p.baseSalary?.toLocaleString()}</td>
                  <td className="p-3 text-right">₹{(p.bonus ?? 0).toLocaleString()}</td>
                  <td className="p-3 text-right">₹{(p.deductions ?? 0).toLocaleString()}</td>
                  <td className="p-3 text-right font-semibold">₹{p.netPay?.toLocaleString()}</td>
                  <td className="p-3 text-center">
                    <Badge variant={p.paidAt ? "success" : "warning"}>{p.paidAt ? "PAID" : "PENDING"}</Badge>
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

/* ─── Local Users SVG Icon ─── */

function UsersIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
