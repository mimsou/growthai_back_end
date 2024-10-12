import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class CrawlingSession extends Document {
  @Prop({ required: true, unique: true })
  crawlingId: string;

  @Prop({ required: true })
  websiteDomain: string;

  @Prop({ type: [String] })
  startingPoints: string[];
}

export const CrawlingSessionSchema = SchemaFactory.createForClass(CrawlingSession);
