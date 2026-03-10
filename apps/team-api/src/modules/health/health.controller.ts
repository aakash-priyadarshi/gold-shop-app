import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../auth/public.decorator";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Get()
  @Public()
  check() {
    return {
      status: "ok",
      service: "team-api",
      timestamp: new Date().toISOString(),
    };
  }
}
