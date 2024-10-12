import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class RobotsData extends Document {
  @Prop({ required: true })
  auditId: string;

  @Prop({ required: true })
  exist: boolean;

  @Prop()
  content?: string;
}

export const RobotsDataSchema = SchemaFactory.createForClass(RobotsData);
