import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class CrawlingData extends Document {
  @Prop({ required: true })
  crawlingId: string;

  @Prop()
  pageTitle: string;

  @Prop({ required: true })
  pageUrlRelative: string;

  @Prop({ type: Object })
  pageMetaData: Record<string, string>;

  @Prop({ type: Array })
  imageData: any[];

  @Prop()
  mainContent: string;

  @Prop()
  wordCount: number;

  @Prop()
  loadTime: number;

  @Prop({ type: Object })
  urlStructure: Record<string, string>;

  @Prop({ type: Object })
  brandingElements: Record<string, boolean>;

  @Prop({ type: [String] })
  structuredData: string[];

  @Prop({ type: Object })
  seoScores: Record<string, number>;

  @Prop({ type: Object })
  directoryTree: {
    name: string;
    type: string;
    children: any[];
  };

  @Prop()
  directoryTreeDepth: number;

  @Prop()
  directoryTreeFileCount: number;

  @Prop()
  directoryTreeFolderCount: number;

  @Prop({ type: [String] })
  directoryTreeFileTypes: string[];
}

export const CrawlingDataSchema = SchemaFactory.createForClass(CrawlingData);
