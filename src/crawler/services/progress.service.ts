import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrawlerConfigService } from '../config/crawler-config.service';

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);
  private uniqueUrls: Set<string> = new Set();
  private estimatedTotalUrls: number = 0;
  private processedUrls: number = 0;
  private weightedProgress: number = 0;

  constructor(
    private configService: CrawlerConfigService,
  ) {}

  reset() {
    this.uniqueUrls.clear();
    this.estimatedTotalUrls = 0;
    this.processedUrls = 0;
    this.weightedProgress = 0;
  }

  updateProgress(crawlingId: string, newUrls: string[], processedUrlsLength: number) {
    this.processedUrls = processedUrlsLength;
    this.logger.debug(`Updating progress for crawling session ${crawlingId} , ${newUrls.length} new urls, ${processedUrlsLength} processed urls`);
    newUrls.forEach(url => this.uniqueUrls.add(url));
    this.estimatedTotalUrls = this.uniqueUrls.size;
    this.logger.debug(`estimatedTotalUrls ${this.estimatedTotalUrls}`)

    const percentage = this.calculatePercentage();
     this.logger.debug(`Updated progress for crawling session ${crawlingId} to ${percentage}%`);
    return percentage;
  }

  private calculatePercentage(): number {
    const percentage = (this.processedUrls / this.estimatedTotalUrls) * 100;
    return percentage;
  }

}