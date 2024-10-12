import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class SitemapData extends Document {
  @Prop({ required: true })
  auditId: string;

  @Prop({ required: true })
  xmlExist: boolean;

  @Prop()
  xmlContent?: string;

  @Prop()
  xmlUrls?: string[];

  @Prop({ required: true })
  htmlExist: boolean;

  @Prop()
  htmlContent?: string;
}

export const SitemapDataSchema = SchemaFactory.createForClass(SitemapData);
