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

  @Prop({ type: [String] })
  extractedKeywords: string[];

  @Prop({ type: Object })
  canonicalConsistencyAnalysis: {
    isConsistent: boolean;
    inconsistencies: {
      canonicalUrl: string;
      conflictingUrls: string[];
    }[];
  };

  @Prop({ type: [{ url: String, duplicateUrls: [String] }] })
  duplicateContent: { url: string; duplicateUrls: string[] }[];

  @Prop({ type: [{ url: String, nearDuplicateUrls: [String] }] })
  nearDuplicateContent: { url: string; nearDuplicateUrls: string[] }[];
}
export const CrawlingSessionSchema = SchemaFactory.createForClass(CrawlingSession);
