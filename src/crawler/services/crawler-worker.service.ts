import { Injectable, Logger } from '@nestjs/common';
import { ContentExtractor } from './extraction/content-extractor';
import { SEOAnalyzer } from './analysis/seo-analyzer';
import { UrlExtractor } from './extraction/url-extractor';
import { CrawlingDataRepository } from '../repository/crawling-data.repository';
import { CrawlerConfigService } from '../config/crawler-config.service';
import { RobotsTxtService } from './robot/robots-txt.service';
import { InclusionExclusionService } from '../config/inclusion-exclusion.service';
import { DirectoryTreeAnalyzer } from './analysis/directory-tree-analyzer';
import { DirectoryTreeCrawlerService } from './directory-tree/directory-tree-crawler.service';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class CrawlerWorker {
  private contentExtractor: ContentExtractor;
  private seoAnalyzer: SEOAnalyzer;
  private urlExtractor: UrlExtractor;
  private readonly logger = new Logger(CrawlerWorker.name);

  constructor(
    private crawlingDataRepository: CrawlingDataRepository,
    private crawlerConfigService: CrawlerConfigService,
    private robotsTxtService: RobotsTxtService,
    private inclusionExclusionService: InclusionExclusionService,
    private directoryTreeAnalyzer: DirectoryTreeAnalyzer,
    private directoryTreeCrawlerService: DirectoryTreeCrawlerService
  ) {
    this.contentExtractor = new ContentExtractor();
    this.seoAnalyzer = new SEOAnalyzer(this.directoryTreeAnalyzer);
    this.urlExtractor = new UrlExtractor(crawlerConfigService, robotsTxtService, inclusionExclusionService);
  }

  async crawlAndExtract(crawlingId: string, url: string, depth: number, crawlConfig: any): Promise<any> {
    try {
      const { $, loadTime, statusCode } = await this.fetchPageWithStatus(url);
      
      if (statusCode >= 400) {
        this.logger.warn(`Broken link detected: ${url} (Status: ${statusCode})`);
        await this.crawlingDataRepository.updateCrawlingData({
          crawlingId,
          pageUrlRelative: url,
          isBroken: true,
          statusCode,
          depth,
        });
        return { newUrls: [] };
      }

      const pageData = await this.contentExtractor.extractPageData($, url, loadTime);
      const seoScores = await this.seoAnalyzer.calculateSEOScores($, pageData);
      
      await this.crawlingDataRepository.updateCrawlingData({
        ...pageData,
        crawlingId,
        seoScores,
        depth,
        statusCode,
        isBroken: false,
      });

      const newUrls = await this.urlExtractor.extractLinks($, url, depth, crawlConfig);

      return { pageData, seoScores, newUrls };
    } catch (error) {
      this.logger.error(`Error crawling ${url}: ${error.message}`);
      await this.crawlingDataRepository.updateCrawlingData({
        crawlingId,
        pageUrlRelative: url,
        isBroken: true,
        error: error.message,
        depth,
      });
      return { newUrls: [] };
    }
  }

  private async fetchPageWithStatus(url: string): Promise<{ $: cheerio.CheerioAPI; loadTime: number; statusCode: number }> {
    const startTime = Date.now();
    try {
      const response = await axios.get(url, { 
        validateStatus: () => true,
        timeout: this.crawlerConfigService.getCrawlerConfig().requestTimeout
      });
      const loadTime = Date.now() - startTime;
      const $ = cheerio.load(response.data);
      return { $, loadTime, statusCode: response.status };
    } catch (error) {
      const loadTime = Date.now() - startTime;
      return { $: cheerio.load(''), loadTime, statusCode: error.response?.status || 0 };
    }
  }

  async crawlDirectoryTree(crawlingId: string, rootPath: string, crawlConfig: any): Promise<any> {
    const directoryTree = await this.directoryTreeCrawlerService.crawlDirectoryTree(rootPath);
    const analysis = await this.directoryTreeAnalyzer.analyzeDirectoryTree(directoryTree);
    await this.crawlingDataRepository.updateCrawlingData({
      crawlingId,
      directoryTree,
      directoryTreeAnalysis: analysis,
    });
    return { directoryTree, analysis };
  }
}