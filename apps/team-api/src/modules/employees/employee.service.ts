import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class EmployeeService {
  private readonly logger = new Logger(EmployeeService.name);

  constructor(private prisma: PrismaService) {}

  /* ─── DEPARTMENTS ─── */

  async createDepartment(data: { name: string; description?: string }) {
    return this.prisma.department.create({ data });
  }

  async listDepartments() {
    return this.prisma.department.findMany({
      where: { isActive: true },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: "asc" },
    });
  }

  async updateDepartment(id: string, data: { name?: string; description?: string; headId?: string; isActive?: boolean }) {
    return this.prisma.department.update({ where: { id }, data });
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
  }) {
    // Generate employee code
    const count = await this.prisma.employee.count();
    const employeeCode = `ORI-EMP-${String(count + 1).padStart(3, "0")}`;

    const existing = await this.prisma.employee.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new ConflictException("Employee with this email already exists");

    return this.prisma.employee.create({
      data: { ...data, employeeCode },
      include: { department: true },
    });
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
      },
    });
    if (!emp) throw new NotFoundException("Employee not found");
    return emp;
  }

  async updateEmployee(id: string, data: Record<string, any>) {
    return this.prisma.employee.update({
      where: { id },
      data,
      include: { department: true },
    });
  }

  async terminateEmployee(id: string) {
    return this.prisma.employee.update({
      where: { id },
      data: { isActive: false, terminatedAt: new Date() },
    });
  }

  /* ─── ATTENDANCE ─── */

  async clockIn(employeeId: string, ipAddress?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    if (existing?.clockIn) {
      return existing; // already clocked in
    }

    if (existing) {
      return this.prisma.attendance.update({
        where: { id: existing.id },
        data: { clockIn: new Date(), ipAddress },
      });
    }

    return this.prisma.attendance.create({
      data: {
        employeeId,
        date: today,
        clockIn: new Date(),
        status: "PRESENT",
        ipAddress,
      },
    });
  }

  async clockOut(employeeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await this.prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });
    if (!record?.clockIn) throw new NotFoundException("No clock-in found for today");

    const hoursWorked = (Date.now() - new Date(record.clockIn).getTime()) / 3600000;

    return this.prisma.attendance.update({
      where: { id: record.id },
      data: { clockOut: new Date(), hoursWorked: Math.round(hoursWorked * 100) / 100 },
    });
  }

  async getAttendance(employeeId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    return this.prisma.attendance.findMany({
      where: {
        employeeId,
        date: { gte: start, lte: end },
      },
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

    return {
      date: target.toISOString().split("T")[0],
      totalActive,
      present,
      workFromHome: wfh,
      onLeave,
      absent: totalActive - present - wfh - onLeave,
      records,
    };
  }

  /* ─── LEAVE REQUESTS ─── */

  async createLeaveRequest(employeeId: string, data: {
    type: any;
    startDate: string;
    endDate: string;
    reason?: string;
  }) {
    return this.prisma.leaveRequest.create({
      data: {
        employeeId,
        type: data.type,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        reason: data.reason,
      },
    });
  }

  async listLeaveRequests(filters?: { employeeId?: string; status?: string }) {
    const where: any = {};
    if (filters?.employeeId) where.employeeId = filters.employeeId;
    if (filters?.status) where.status = filters.status;

    return this.prisma.leaveRequest.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async approveLeave(id: string, approverId: string) {
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: "APPROVED", approvedBy: approverId, approvedAt: new Date() },
    });
  }

  async rejectLeave(id: string, approverId: string) {
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: "REJECTED", approvedBy: approverId, approvedAt: new Date() },
    });
  }

  /* ─── PAYROLL ─── */

  async createPayrollRecord(data: {
    employeeId: string;
    month: number;
    year: number;
    baseSalary: number;
    bonus?: number;
    deductions?: number;
  }) {
    const netPay = data.baseSalary + (data.bonus || 0) - (data.deductions || 0);
    return this.prisma.payrollRecord.create({
      data: { ...data, netPay },
    });
  }

  async getPayroll(month: number, year: number) {
    return this.prisma.payrollRecord.findMany({
      where: { month, year },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true, department: true } } },
      orderBy: { employee: { firstName: "asc" } },
    });
  }

  async markPayrollPaid(id: string) {
    return this.prisma.payrollRecord.update({
      where: { id },
      data: { paidAt: new Date() },
    });
  }

  /* ─── DOCUMENTS ─── */

  async addDocument(employeeId: string, data: { name: string; type: string; fileUrl: string }) {
    return this.prisma.employeeDocument.create({
      data: { employeeId, ...data },
    });
  }

  async getDocuments(employeeId: string) {
    return this.prisma.employeeDocument.findMany({
      where: { employeeId },
      orderBy: { uploadedAt: "desc" },
    });
  }

  async deleteDocument(id: string) {
    return this.prisma.employeeDocument.delete({ where: { id } });
  }

  /* ─── KPI ─── */

  async upsertKPI(data: {
    employeeId: string;
    period: string;
    metric: string;
    target: number;
    achieved: number;
  }) {
    const score = data.target > 0 ? (data.achieved / data.target) * 100 : 0;

    return this.prisma.kPIRecord.upsert({
      where: {
        employeeId_period_metric: {
          employeeId: data.employeeId,
          period: data.period,
          metric: data.metric,
        },
      },
      update: { achieved: data.achieved, target: data.target, score },
      create: { ...data, score },
    });
  }

  async getKPIs(employeeId: string, period?: string) {
    const where: any = { employeeId };
    if (period) where.period = period;
    return this.prisma.kPIRecord.findMany({ where, orderBy: { period: "desc" } });
  }
}
