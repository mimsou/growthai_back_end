import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid'; 

@Schema()
export class AuditSession extends Document {
  @Prop({ required: true, default: uuidv4 })
  auditId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, default: Date.now })
  startDateTime: Date;
}

export const AuditSessionSchema = SchemaFactory.createForClass(AuditSession);
