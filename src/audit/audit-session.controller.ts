import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuditSessionService } from './audit-session.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('audit')
export class AuditSessionController {
  constructor(private readonly auditSessionService: AuditSessionService) {}

  //@UseGuards(JwtAuthGuard)
  @Post('new')
  async createAuditSession(@Request() req: any) {
    //console.log(req.user.id);
    const userId = "66eefa9b8319d7e5b17f4d70"
    const session = await this.auditSessionService.createAuditSession(userId);
    return { auditId: session.auditId };
  }
}
