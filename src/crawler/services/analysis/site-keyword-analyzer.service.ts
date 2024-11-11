import { Injectable } from '@nestjs/common';
import { KeywordExtractionService } from './keyword-extraction.service';
import { CrawlerConfigService } from '../../config/crawler-config.service';

@Injectable()
export class SiteKeywordAnalyzerService {
  private maxPagesToAnalyze: number;

  constructor(
    private keywordExtractionService: KeywordExtractionService,
    private crawlerConfigService: CrawlerConfigService
  ) {
    const config = this.crawlerConfigService.getKeywordExtractionConfig();
    this.maxPagesToAnalyze = config.maxPagesToAnalyze;
  }

  async analyzeSiteKeywords(pages: { url: string; pageData: any }[]): Promise<string[]> {
    const allKeywords: string[] = [];
    const analyzedPages = pages.slice(0, this.maxPagesToAnalyze);


    for (const page of analyzedPages) {
      const pageKeywords = this.keywordExtractionService.identifyImportantTerms(page?.pageData?.mainContent ? page.pageData.mainContent : '');
      allKeywords.push(...pageKeywords);
    }

    const keywordFrequency = this.calculateKeywordFrequency(allKeywords);
    const sortedKeywords = this.sortKeywordsByFrequency(keywordFrequency);

    return sortedKeywords.slice(0, this.crawlerConfigService.getKeywordExtractionConfig().maxKeywords);
  }

  private calculateKeywordFrequency(keywords: string[]): Map<string, number> {
    const frequency = new Map<string, number>();
    for (const keyword of keywords) {
      frequency.set(keyword, (frequency.get(keyword) || 0) + 1);
    }
    return frequency;
  }

  private sortKeywordsByFrequency(frequency: Map<string, number>): string[] {
    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
  }
}
