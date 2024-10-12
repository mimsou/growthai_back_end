import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditSessionController } from './audit-session.controller';
import { AuditSessionService } from './audit-session.service';
import { AuditSession, AuditSessionSchema } from './audit-session.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: AuditSession.name, schema: AuditSessionSchema }])],
  controllers: [AuditSessionController],
  providers: [AuditSessionService],
})
export class AuditSessionModule {}
