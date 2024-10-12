import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class PromptData extends Document {
  @Prop({ required: true })
  seoSubject: string;

  @Prop()
  content?: string;
}

export const PromptDataSchema = SchemaFactory.createForClass(PromptData);