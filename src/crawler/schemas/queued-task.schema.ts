import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class QueuedTask extends Document {
  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  priority: number;

  @Prop({ required: true })
  depth: number;
}

export const QueuedTaskSchema = SchemaFactory.createForClass(QueuedTask);
