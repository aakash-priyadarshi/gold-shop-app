import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { department: true },
    });

    if (!employee) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!employee.isActive) {
      throw new UnauthorizedException("Account is deactivated");
    }

    if (!employee.passwordHash) {
      throw new BadRequestException(
        "Password not set. Please set up your password first.",
      );
    }

    const isValid = await bcrypt.compare(password, employee.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const payload = {
      sub: employee.id,
      email: employee.email,
      role: employee.role,
      employeeCode: employee.employeeCode,
      departmentId: employee.departmentId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: "7d" });

    return {
      accessToken,
      refreshToken,
      employee: {
        id: employee.id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: employee.role,
        employeeCode: employee.employeeCode,
        department: employee.department.name,
        avatarUrl: employee.avatarUrl,
      },
    };
  }

  /**
   * Set up password for a new employee using a setup token.
   * The setup token is the employee's employeeCode (e.g. ORI-EMP-001).
   * Admin creates employees, gives them their code, they use it + email to set password.
   */
  async setupPassword(email: string, setupToken: string, password: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!employee) {
      throw new BadRequestException("Employee not found");
    }

    if (employee.employeeCode !== setupToken) {
      throw new BadRequestException("Invalid setup token");
    }

    if (employee.passwordHash) {
      throw new BadRequestException("Password already set. Use login instead.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await this.prisma.employee.update({
      where: { id: employee.id },
      data: { passwordHash },
    });

    return { message: "Password set successfully. You can now login." };
  }

  async getProfile(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: true },
    });

    if (!employee) {
      throw new UnauthorizedException("Employee not found");
    }

    return {
      id: employee.id,
      email: employee.email,
      firstName: employee.firstName,
      lastName: employee.lastName,
      role: employee.role,
      employeeCode: employee.employeeCode,
      department: employee.department.name,
      departmentId: employee.departmentId,
      jobTitle: employee.jobTitle,
      avatarUrl: employee.avatarUrl,
      phone: employee.phone,
      joinedAt: employee.joinedAt,
    };
  }
}
