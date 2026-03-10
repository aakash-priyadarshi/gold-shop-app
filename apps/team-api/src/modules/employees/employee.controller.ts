import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Ip,
} from "@nestjs/common";
import { EmployeeService } from "./employee.service";
import { Roles } from "../../auth/roles.decorator";
import { CurrentUser } from "../../auth/current-user.decorator";

@Controller("employees")
export class EmployeeController {
  constructor(private svc: EmployeeService) {}

  /* ─── DEPARTMENTS ─── */

  @Post("departments")
  @Roles("ADMIN")
  createDepartment(@Body() body: { name: string; description?: string }) {
    return this.svc.createDepartment(body);
  }

  @Get("departments")
  listDepartments() {
    return this.svc.listDepartments();
  }

  @Put("departments/:id")
  @Roles("ADMIN")
  updateDepartment(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateDepartment(id, body);
  }

  /* ─── EMPLOYEES ─── */

  @Post()
  @Roles("ADMIN")
  createEmployee(@Body() body: any) {
    return this.svc.createEmployee(body);
  }

  @Get()
  listEmployees(
    @Query("departmentId") departmentId?: string,
    @Query("role") role?: string,
    @Query("active") active?: string,
    @Query("search") search?: string,
  ) {
    return this.svc.listEmployees({
      departmentId,
      role,
      isActive: active !== undefined ? active === "true" : undefined,
      search,
    });
  }

  @Get(":id")
  getEmployee(@Param("id") id: string) {
    return this.svc.getEmployee(id);
  }

  @Put(":id")
  @Roles("ADMIN")
  updateEmployee(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateEmployee(id, body);
  }

  @Patch(":id/terminate")
  @Roles("ADMIN")
  terminateEmployee(@Param("id") id: string) {
    return this.svc.terminateEmployee(id);
  }

  /* ─── ATTENDANCE ─── */

  @Post("attendance/clock-in")
  clockIn(@Body() body: { employeeId: string }, @Ip() ip: string) {
    return this.svc.clockIn(body.employeeId, ip);
  }

  @Post("attendance/clock-out")
  clockOut(@Body() body: { employeeId: string }) {
    return this.svc.clockOut(body.employeeId);
  }

  @Get("attendance/summary")
  getAttendanceSummary(@Query("date") date?: string) {
    return this.svc.getAttendanceSummary(date ? new Date(date) : undefined);
  }

  @Get(":id/attendance")
  getAttendance(
    @Param("id") id: string,
    @Query("month") month: string,
    @Query("year") year: string,
  ) {
    return this.svc.getAttendance(id, parseInt(month), parseInt(year));
  }

  /* ─── LEAVE ─── */

  @Post("leave")
  createLeave(@Body() body: any) {
    return this.svc.createLeaveRequest(body.employeeId, body);
  }

  @Get("leave/requests")
  listLeave(
    @Query("employeeId") employeeId?: string,
    @Query("status") status?: string,
  ) {
    return this.svc.listLeaveRequests({ employeeId, status });
  }

  @Patch("leave/:id/approve")
  @Roles("ADMIN")
  approveLeave(@Param("id") id: string, @CurrentUser() user: any) {
    return this.svc.approveLeave(id, user.id);
  }

  @Patch("leave/:id/reject")
  @Roles("ADMIN")
  rejectLeave(@Param("id") id: string, @CurrentUser() user: any) {
    return this.svc.rejectLeave(id, user.id);
  }

  /* ─── PAYROLL ─── */

  @Post("payroll")
  @Roles("ADMIN")
  createPayroll(@Body() body: any) {
    return this.svc.createPayrollRecord(body);
  }

  @Get("payroll")
  @Roles("ADMIN")
  getPayroll(@Query("month") month: string, @Query("year") year: string) {
    return this.svc.getPayroll(parseInt(month), parseInt(year));
  }

  @Patch("payroll/:id/paid")
  @Roles("ADMIN")
  markPaid(@Param("id") id: string) {
    return this.svc.markPayrollPaid(id);
  }

  /* ─── DOCUMENTS ─── */

  @Post(":id/documents")
  addDocument(@Param("id") id: string, @Body() body: { name: string; type: string; fileUrl: string }) {
    return this.svc.addDocument(id, body);
  }

  @Get(":id/documents")
  getDocuments(@Param("id") id: string) {
    return this.svc.getDocuments(id);
  }

  @Delete("documents/:id")
  @Roles("ADMIN")
  deleteDocument(@Param("id") id: string) {
    return this.svc.deleteDocument(id);
  }

  /* ─── KPI ─── */

  @Post("kpi")
  @Roles("ADMIN")
  upsertKPI(@Body() body: any) {
    return this.svc.upsertKPI(body);
  }

  @Get(":id/kpi")
  getKPIs(@Param("id") id: string, @Query("period") period?: string) {
    return this.svc.getKPIs(id, period);
  }
}
