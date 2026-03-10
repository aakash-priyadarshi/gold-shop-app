import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  Ip,
} from "@nestjs/common";
import { CertificateService } from "./certificate.service";
import { Roles } from "../../auth/roles.decorator";
import { Public } from "../../auth/public.decorator";
import { CurrentUser } from "../../auth/current-user.decorator";

@Controller("certificates")
export class CertificateController {
  constructor(private svc: CertificateService) {}

  /* ─── TEMPLATES ─── */

  @Post("templates")
  @Roles("ADMIN")
  createTemplate(@Body() body: any) {
    return this.svc.createTemplate(body);
  }

  @Get("templates")
  listTemplates() {
    return this.svc.listTemplates();
  }

  @Get("templates/:id")
  getTemplate(@Param("id") id: string) {
    return this.svc.getTemplate(id);
  }

  @Put("templates/:id")
  @Roles("ADMIN")
  updateTemplate(@Param("id") id: string, @Body() body: any) {
    return this.svc.updateTemplate(id, body);
  }

  /* ─── CERTIFICATES ─── */

  @Post()
  @Roles("ADMIN")
  issueCertificate(@Body() body: any) {
    return this.svc.issueCertificate(body);
  }

  @Get()
  listCertificates(
    @Query("templateId") templateId?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    return this.svc.listCertificates({ templateId, status, search });
  }

  @Get(":id")
  getCertificate(@Param("id") id: string) {
    return this.svc.getCertificate(id);
  }

  @Patch(":id/revoke")
  @Roles("ADMIN")
  revokeCertificate(@Param("id") id: string, @Body() body: { reason: string }) {
    return this.svc.revokeCertificate(id, body.reason);
  }

  @Get(":id/verifications")
  getVerificationHistory(@Param("id") id: string) {
    return this.svc.getVerificationHistory(id);
  }

  /* ─── PUBLIC VERIFICATION (no auth required) ─── */

  @Public()
  @Get("verify/:qrToken")
  verifyCertificate(@Param("qrToken") qrToken: string, @Ip() ip: string) {
    return this.svc.verifyCertificate(qrToken, ip);
  }
}
