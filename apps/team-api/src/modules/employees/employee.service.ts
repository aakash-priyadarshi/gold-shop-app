import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MailService } from "../mail/mail.service";

@Injectable()
export class EmployeeService {
  private readonly logger = new Logger(EmployeeService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  /* ─── DEPARTMENTS ─── */

  async createDepartment(data: { name: string; description?: string; headId?: string }) {
    return this.prisma.department.create({ data });
  }

  async listDepartments() {
    return this.prisma.department.findMany({
      where: { isActive: true },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: "asc" },
    });
  }

  async getDepartment(id: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: {
        employees: {
          where: { isActive: true },
          select: { id: true, firstName: true, lastName: true, role: true, jobTitle: true, employeeCode: true },
        },
        _count: { select: { employees: true } },
      },
    });
    if (!dept) throw new NotFoundException("Department not found");
    return dept;
  }

  async updateDepartment(id: string, data: { name?: string; description?: string; headId?: string; isActive?: boolean }) {
    return this.prisma.department.update({ where: { id }, data });
  }

  async deleteDepartment(id: string) {
    const empCount = await this.prisma.employee.count({ where: { departmentId: id, isActive: true } });
    if (empCount > 0) throw new BadRequestException("Cannot delete department with active employees. Reassign them first.");
    return this.prisma.department.update({ where: { id }, data: { isActive: false } });
  }

  /* ─── EMPLOYEES ─── */

  async createEmployee(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    departmentId: string;
    role?: any;
    jobTitle?: string;
    salary?: number;
    currency?: string;
    mainUserId?: string;
    mainShopId?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyRelation?: string;
    panNumber?: string;
    aadhaarLast4?: string;
    bloodGroup?: string;
    maritalStatus?: string;
    nationality?: string;
    bankAccountNo?: string;
    bankName?: string;
    bankIfsc?: string;
    bankBranch?: string;
    employmentType?: any;
    shiftTiming?: string;
    reportingToId?: string;
  }, creatorId?: string) {
    // Generate employee code
    const count = await this.prisma.employee.count();
    const employeeCode = `ORI-EMP-${String(count + 1).padStart(3, "0")}`;

    const existing = await this.prisma.employee.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new ConflictException("Employee with this email already exists");

    const { dateOfBirth, ...rest } = data;
    const employee = await this.prisma.employee.create({
      data: {
        ...rest,
        employeeCode,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      },
      include: { department: true },
    });

    // Log activity
    await this.logActivity(creatorId, "CREATED_EMPLOYEE", "employees", employee.id, `Created employee ${employee.firstName} ${employee.lastName}`);

    // Send welcome email (non-blocking)
    this.mail.sendWelcomeEmail(
      employee.email,
      `${employee.firstName} ${employee.lastName}`,
      employeeCode,
      employee.role,
    ).catch(() => {});

    return employee;
  }

  async listEmployees(filters?: {
    departmentId?: string;
    role?: string;
    isActive?: boolean;
    search?: string;
  }) {
    const where: any = {};
    if (filters?.departmentId) where.departmentId = filters.departmentId;
    if (filters?.role) where.role = filters.role;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { employeeCode: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return this.prisma.employee.findMany({
      where,
      include: { department: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getEmployee(id: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        documents: true,
        kpiRecords: { take: 10, orderBy: { createdAt: "desc" } },
        payrollRecords: { take: 6, orderBy: { year: "desc" } },
        leaveRequests: { take: 10, orderBy: { createdAt: "desc" } },
      },
    });
    if (!emp) throw new NotFoundException("Employee not found");
    return emp;
  }

  async updateEmployee(id: string, data: Record<string, any>, updaterId?: string) {
    if (data.dateOfBirth && typeof data.dateOfBirth === "string") {
      data.dateOfBirth = new Date(data.dateOfBirth);
    }
    const emp = await this.prisma.employee.update({
      where: { id },
      data,
      include: { department: true },
    });
    await this.logActivity(updaterId, "UPDATED_EMPLOYEE", "employees", id, `Updated employee ${emp.firstName} ${emp.lastName}`);
    return emp;
  }

  async terminateEmployee(id: string, reason?: string, terminatorId?: string) {
    const emp = await this.prisma.employee.update({
      where: { id },
      data: { isActive: false, terminatedAt: new Date(), terminationReason: reason },
    });
    await this.logActivity(terminatorId, "TERMINATED_EMPLOYEE", "employees", id, `Terminated ${emp.firstName} ${emp.lastName}: ${reason || "No reason"}`);

    // Send termination email (non-blocking)
    this.mail.sendTerminationEmail(emp.email, `${emp.firstName} ${emp.lastName}`, reason).catch(() => {});

    return emp;
  }

  /* ─── ATTENDANCE ─── */

  async clockIn(employeeId: string, ipAddress?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    if (existing?.clockIn) return existing;

    if (existing) {
      return this.prisma.attendance.update({
        where: { id: existing.id },
        data: { clockIn: new Date(), ipAddress },
      });
    }

    const record = await this.prisma.attendance.create({
      data: { employeeId, date: today, clockIn: new Date(), status: "PRESENT", ipAddress },
    });
    await this.logActivity(employeeId, "CLOCKED_IN", "attendance", record.id);
    return record;
  }

  async clockOut(employeeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await this.prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });
    if (!record?.clockIn) throw new NotFoundException("No clock-in found for today");

    const hoursWorked = (Date.now() - new Date(record.clockIn).getTime()) / 3600000;

    const updated = await this.prisma.attendance.update({
      where: { id: record.id },
      data: { clockOut: new Date(), hoursWorked: Math.round(hoursWorked * 100) / 100 },
    });
    await this.logActivity(employeeId, "CLOCKED_OUT", "attendance", record.id);
    return updated;
  }

  async getAttendance(employeeId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return this.prisma.attendance.findMany({
      where: { employeeId, date: { gte: start, lte: end } },
      orderBy: { date: "asc" },
    });
  }

  async getAttendanceSummary(date?: Date) {
    const target = date || new Date();
    target.setHours(0, 0, 0, 0);

    const records = await this.prisma.attendance.findMany({
      where: { date: target },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
    });

    const totalActive = await this.prisma.employee.count({ where: { isActive: true } });
    const present = records.filter((r) => r.status === "PRESENT").length;
    const wfh = records.filter((r) => r.status === "WORK_FROM_HOME").length;
    const onLeave = records.filter((r) => r.status === "ON_LEAVE").length;

    return { date: target.toISOString().split("T")[0], totalActive, present, workFromHome: wfh, onLeave, absent: totalActive - present - wfh - onLeave, records };
  }

  /* ─── LEAVE REQUESTS ─── */

  async createLeaveRequest(employeeId: string, data: { type: any; startDate: string; endDate: string; reason?: string }) {
    return this.prisma.leaveRequest.create({
      data: { employeeId, type: data.type, startDate: new Date(data.startDate), endDate: new Date(data.endDate), reason: data.reason },
    });
  }

  async listLeaveRequests(filters?: { employeeId?: string; status?: string }) {
    const where: any = {};
    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.status) where.status = filters.status;
    return this.prisma.leaveRequest.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async approveLeave(id: string, approverId: string) {
    const leave = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: "APPROVED", approvedBy: approverId, approvedAt: new Date() },
      include: { employee: true },
    });
    await this.logActivity(approverId, "APPROVED_LEAVE", "leave", id);

    // Send email notification (non-blocking)
    this.mail.sendLeaveStatusEmail(
      leave.employee.email,
      `${leave.employee.firstName} ${leave.employee.lastName}`,
      "APPROVED",
      leave.type,
      leave.startDate.toISOString().split("T")[0],
      leave.endDate.toISOString().split("T")[0],
    ).catch(() => {});

    return leave;
  }

  async rejectLeave(id: string, approverId: string) {
    const leave = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: "REJECTED", approvedBy: approverId, approvedAt: new Date() },
      include: { employee: true },
    });
    await this.logActivity(approverId, "REJECTED_LEAVE", "leave", id);

    this.mail.sendLeaveStatusEmail(
      leave.employee.email,
      `${leave.employee.firstName} ${leave.employee.lastName}`,
      "REJECTED",
      leave.type,
      leave.startDate.toISOString().split("T")[0],
      leave.endDate.toISOString().split("T")[0],
    ).catch(() => {});

    return leave;
  }

  /* ─── PAYROLL ─── */

  async createPayrollRecord(data: { employeeId: string; month: number; year: number; baseSalary: number; bonus?: number; deductions?: number }) {
    const netPay = data.baseSalary + (data.bonus || 0) - (data.deductions || 0);
    return this.prisma.payrollRecord.create({ data: { ...data, netPay } });
  }

  async getPayroll(month: number, year: number) {
    return this.prisma.payrollRecord.findMany({
      where: { month, year },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true, department: true } } },
      orderBy: { employee: { firstName: "asc" } },
    });
  }

  async markPayrollPaid(id: string) {
    return this.prisma.payrollRecord.update({ where: { id }, data: { paidAt: new Date() } });
  }

  /* ─── DOCUMENTS ─── */

  async addDocument(employeeId: string, data: { name: string; type: string; fileUrl: string }) {
    return this.prisma.employeeDocument.create({ data: { employeeId, ...data } });
  }

  async getDocuments(employeeId: string) {
    return this.prisma.employeeDocument.findMany({ where: { employeeId }, orderBy: { uploadedAt: "desc" } });
  }

  async deleteDocument(id: string) {
    return this.prisma.employeeDocument.delete({ where: { id } });
  }

  /* ─── KPI ─── */

  async upsertKPI(data: { employeeId: string; period: string; metric: string; target: number; achieved: number }) {
    const score = data.target > 0 ? (data.achieved / data.target) * 100 : 0;
    return this.prisma.kPIRecord.upsert({
      where: { employeeId_period_metric: { employeeId: data.employeeId, period: data.period, metric: data.metric } },
      update: { achieved: data.achieved, target: data.target, score },
      create: { ...data, score },
    });
  }

  async getKPIs(employeeId: string, period?: string) {
    const where: any = { employeeId };
    if (period) where.period = period;
    return this.prisma.kPIRecord.findMany({ where, orderBy: { period: "desc" } });
  }

  /* ─── ROLE PERMISSIONS ─── */

  async listRolePermissions(role?: string) {
    const where: any = {};
    if (role) where.role = role;
    return this.prisma.rolePermission.findMany({ where, orderBy: [{ role: "asc" }, { module: "asc" }] });
  }

  async upsertRolePermission(data: {
    role: any;
    module: string;
    canView?: boolean;
    canCreate?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    canApprove?: boolean;
    canExport?: boolean;
  }) {
    return this.prisma.rolePermission.upsert({
      where: { role_module: { role: data.role, module: data.module } },
      update: data,
      create: data,
    });
  }

  async bulkUpsertRolePermissions(permissions: Array<{
    role: any;
    module: string;
    canView?: boolean;
    canCreate?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    canApprove?: boolean;
    canExport?: boolean;
  }>) {
    const results = [];
    for (const p of permissions) {
      results.push(await this.upsertRolePermission(p));
    }
    return results;
  }

  async getPermissionsForRole(role: string) {
    return this.prisma.rolePermission.findMany({ where: { role: role as any } });
  }

  async deleteRolePermission(id: string) {
    return this.prisma.rolePermission.delete({ where: { id } });
  }

  /* ─── ACTIVITY LOG ─── */

  async logActivity(employeeId: string | undefined, action: string, module: string, targetId?: string, details?: string, ipAddress?: string) {
    try {
      await this.prisma.activityLog.create({
        data: { employeeId: employeeId || null, action, module, targetId, details, ipAddress },
      });
    } catch (e) {
      this.logger.warn(`Failed to log activity: ${action}`);
    }
  }

  async getActivityLogs(filters?: { module?: string; employeeId?: string; limit?: number }) {
    const where: any = {};
    if (filters?.module) where.module = filters.module;
    if (filters?.employeeId) where.employeeId = filters.employeeId;
    return this.prisma.activityLog.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
      orderBy: { createdAt: "desc" },
      take: filters?.limit || 50,
    });
  }
}
