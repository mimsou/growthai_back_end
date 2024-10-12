import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditSession } from './audit-session.schema';

@Injectable()
export class AuditSessionService {
  constructor(
    @InjectModel(AuditSession.name) private readonly auditSessionModel: Model<AuditSession>,
  ) {}

  async createAuditSession(userId: string): Promise<AuditSession> {
    const newAuditSession = new this.auditSessionModel({ userId });
    return newAuditSession.save();
  }
}
