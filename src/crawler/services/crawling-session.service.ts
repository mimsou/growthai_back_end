import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrawlingSession } from '../schemas/crawling-session.schema';

@Injectable()
export class CrawlingSessionService {
  constructor(
    @InjectModel(CrawlingSession.name) private crawlingSessionModel: Model<CrawlingSession>
  ) {}


  async updateExtractedKeywords(crawlingId: string, keywords: string[]): Promise<void> {
    await this.crawlingSessionModel.findOneAndUpdate(
      { crawlingId },
      { $set: { extractedKeywords: keywords } },
      { new: true }
    );
  }

  async getExtractedKeywords(crawlingId: string): Promise<string[]> {
    const session = await this.crawlingSessionModel.findOne({ crawlingId }).exec();
    return session?.extractedKeywords || [];
  }

  async updateCanonicalConsistencyAnalysis(crawlingId: string, analysis: any): Promise<void> {
    await this.crawlingSessionModel.findOneAndUpdate(
      { crawlingId },
      { $set: { canonicalConsistencyAnalysis: analysis } },
      { new: true }
    );
  }

  async updateDuplicateContent(
    crawlingId: string, 
    duplicates: Map<string, string[]>, 
    nearDuplicates: Map<string, string[]>
  ): Promise<void> {
    const duplicateEntries = Array.from(duplicates.entries()).map(([url, duplicateUrls]) => ({
      url,
      duplicateUrls
    }));

    const nearDuplicateEntries = Array.from(nearDuplicates.entries()).map(([url, nearDuplicateUrls]) => ({
      url,
      nearDuplicateUrls
    }));

    await this.crawlingSessionModel.findOneAndUpdate(
      { crawlingId },
      {
        $set: {
          duplicateContent: duplicateEntries,
          nearDuplicateContent: nearDuplicateEntries
        }
      },
      { new: true }
    );
  }
}
