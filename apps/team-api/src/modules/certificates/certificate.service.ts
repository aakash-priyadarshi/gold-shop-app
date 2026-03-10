import {
  Injectable,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import * as QRCode from "qrcode";

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /* ─── TEMPLATES ─── */

  async createTemplate(data: {
    name: string;
    type: any;
    htmlTemplate: string;
    cssStyles?: string;
    variables?: string[];
  }) {
    return this.prisma.certificateTemplate.create({ data });
  }

  async listTemplates() {
    return this.prisma.certificateTemplate.findMany({
      where: { isActive: true },
      include: { _count: { select: { certificates: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async getTemplate(id: string) {
    const tpl = await this.prisma.certificateTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException("Template not found");
    return tpl;
  }

  async updateTemplate(id: string, data: Record<string, any>) {
    return this.prisma.certificateTemplate.update({ where: { id }, data });
  }

  /* ─── CERTIFICATES ─── */

  async issueCertificate(data: {
    templateId: string;
    employeeId: string;
    title: string;
    data?: Record<string, any>;
  }) {
    const certNo = `ORI-CERT-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString("hex").toUpperCase()}`;
    const qrToken = randomBytes(16).toString("hex");

    return this.prisma.certificate.create({
      data: {
        templateId: data.templateId,
        employeeId: data.employeeId,
        title: data.title,
        data: data.data || {},
        certificateNo: certNo,
        qrToken,
        status: "ACTIVE",
      },
      include: { template: { select: { name: true, type: true } } },
    });
  }

  async listCertificates(filters?: {
    templateId?: string;
    status?: string;
    search?: string;
  }) {
    const where: any = {};
    if (filters?.templateId) where.templateId = filters.templateId;
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { certificateNo: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return this.prisma.certificate.findMany({
      where,
      include: {
        template: { select: { name: true, type: true } },
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { issuedAt: "desc" },
    });
  }

  async getCertificate(id: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { id },
      include: {
        template: true,
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
        verifications: { take: 10, orderBy: { verifiedAt: "desc" } },
      },
    });
    if (!cert) throw new NotFoundException("Certificate not found");
    return cert;
  }

  async revokeCertificate(id: string, reason: string) {
    return this.prisma.certificate.update({
      where: { id },
      data: { status: "REVOKED", revokedAt: new Date(), revokeReason: reason },
    });
  }

  /* ─── PUBLIC VERIFICATION ─── */

  async verifyCertificate(qrToken: string, ipAddress?: string) {
    const cert = await this.prisma.certificate.findUnique({
      where: { qrToken },
      include: {
        template: { select: { name: true, type: true } },
        employee: { select: { firstName: true, lastName: true } },
      },
    });

    if (!cert) {
      return { valid: false, message: "Certificate not found" };
    }

    // Log verification
    await this.prisma.certificateVerification.create({
      data: { certificateId: cert.id, ipAddress },
    });

    return {
      valid: cert.status === "ACTIVE",
      status: cert.status,
      certificateNo: cert.certificateNo,
      title: cert.title,
      employeeName: `${cert.employee.firstName} ${cert.employee.lastName}`,
      templateName: cert.template.name,
      templateType: cert.template.type,
      issuedAt: cert.issuedAt,
      revokedAt: cert.revokedAt,
      revokeReason: cert.revokeReason,
    };
  }

  async getVerificationHistory(certId: string) {
    return this.prisma.certificateVerification.findMany({
      where: { certificateId: certId },
      orderBy: { verifiedAt: "desc" },
      take: 50,
    });
  }
}
