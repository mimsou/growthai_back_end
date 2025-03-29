import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrawlingSession } from '../schemas/crawling-session.schema';
import { SitemapService } from '../../seo/sitemap/sitemap.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrawlingDataRepository } from '../repository/crawling-data.repository';
import { CrawlerConfigService } from '../config/crawler-config.service';
import { SitemapCrawlerService } from './sitemap/sitemap-crawler.service';
import { Worker } from 'worker_threads';
import * as path from 'path';
import { AsyncHttpService } from './async-http.service';
import { CrawlerWorker } from './crawler-worker.service';
import { ProgressService } from './progress.service';
import { RateLimiterService } from './rate-limiter.service';
import { PerformanceMonitorService } from './performance-monitor.service';
import { SiteKeywordAnalyzerService } from './analysis/site-keyword-analyzer.service';
import { CrawlingSessionService } from  './crawling-session.service';
import { OnPageElementService } from './analysis/on-page-element.service';
import * as sjs from 'simhash-js';

interface CrawlOptions {
  urlLimit?: number;
  depthLimit?: number;
  followInternalLinks?: boolean;
  followExternalLinks?: boolean;
  followSubfolderLinks?: boolean;
  specificUrlList?: string[];
  useDirectoryTreeCrawling?: boolean;
  directoryTreeRootPath?: string;
  customStartingPoints?: string[];
  sitemapEnabled?: boolean;
}

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private workers: Worker[] = [];
  private activeWorkers: number = 0;
  private processedUrls: number = 0;
  private batchSize: number;
  private dataQueue: any[] = [];
  private crawlingSessionServiceId: string;
  private accumulatedKeywords: Set<string> = new Set();
  private canonicalData: { url: string; canonicalHref: string }[] = [];
  private simhashComparator: any;

  constructor(
    @InjectModel(CrawlingSession.name) private crawlingSessionModel: Model<CrawlingSession>,
    private readonly sitemapService: SitemapService,
    private eventEmitter: EventEmitter2,
    private crawlingDataRepository: CrawlingDataRepository,
    private crawlerConfigService: CrawlerConfigService,
    private sitemapCrawlerService: SitemapCrawlerService,
    private asyncHttpService: AsyncHttpService,
    private crawlerWorker: CrawlerWorker,
    private progressService: ProgressService,
    private rateLimiterService: RateLimiterService,
    private performanceMonitorService: PerformanceMonitorService,
    private siteKeywordAnalyzerService: SiteKeywordAnalyzerService,
    private crawlingSessionService: CrawlingSessionService,
    private onPageElementService: OnPageElementService,
  ) {
    this.initializeWorkers();
    this.batchSize = this.crawlerConfigService.getCrawlerConfig().batchUpdateSize || 100;
    this.simhashComparator = sjs.Comparator;
  }

  private initializeWorkers() {
    const { maxThreads } = this.crawlerConfigService.getMultithreadingConfig();
    for (let i = 0; i < maxThreads; i++) {
      const worker = new Worker(path.resolve(__dirname, 'crawler-worker.thread.js'), {
        workerData: { workerId: i }
      });
      this.workers.push(worker);
    }
  }

  async crawlWebsite(url: string, options: CrawlOptions = {}): Promise<any> {
    const domain = new URL(url).hostname;
    const crawlingSession = await this.initiateCrawlingSession(domain);
    this.crawlingSessionServiceId = crawlingSession.crawlingId;
    this.accumulatedKeywords = new Set();

    const config = this.crawlerConfigService.getCrawlerConfig();
    const asyncConfig = this.crawlerConfigService.getAsyncOperationsConfig();
    const finalUrlLimit = options.urlLimit || config.defaultUrlLimit;
    const finalDepthLimit = options.depthLimit || config.defaultDepthLimit;
    
    this.crawlerConfigService.validateCrawlLimits(finalUrlLimit, finalDepthLimit);

    const crawlConfig = {
      ...config,
      ...options,
      urlLimit: finalUrlLimit,
      depthLimit: finalDepthLimit,
    };

    let result;
    if (options.useDirectoryTreeCrawling && options.directoryTreeRootPath) {
      result = await this.crawlDirectoryTree(crawlingSession.crawlingId, options.directoryTreeRootPath, crawlConfig);
    } else if (options.specificUrlList && options.specificUrlList.length > 0) {
      result = await this.crawlSpecificUrlList(crawlingSession.crawlingId, options.specificUrlList, crawlConfig);
    } else {
      result = await this.performRegularCrawl(crawlingSession.crawlingId, url, crawlConfig, asyncConfig);
    }

    // Process any remaining data in the queue
    while (this.dataQueue.length > 0) {
      await this.processBatch();
    }

    const averageScores = await this.crawlingDataRepository.calculateAverageScores(crawlingSession.crawlingId);
    this.eventEmitter.emit('crawling.completed', { crawlingId: crawlingSession.crawlingId, averageScores });

    this.performanceMonitorService.logPerformanceMetrics();

    const canonicalConsistencyAnalysis = this.onPageElementService.analyzeCanonicalConsistency(this.canonicalData);
    this.canonicalData = [];
    await this.crawlingSessionService.updateCanonicalConsistencyAnalysis(crawlingSession.crawlingId, canonicalConsistencyAnalysis);
    await this.performContentComparison(crawlingSession.crawlingId);
    return { ...result, averageScores,canonicalConsistencyAnalysis };
  }

  private async performContentComparison(crawlingId: string): Promise<void> {
    const allPages = await this.crawlingDataRepository.getCrawlingDataById(crawlingId);
    const duplicates: Map<string, string[]> = new Map();
    const nearDuplicates: Map<string, string[]> = new Map();

    for (let i = 0; i < allPages.length; i++) {
      const page = allPages[i];
      for (let j = i + 1; j < allPages.length; j++) {
        const comparePage = allPages[j];
        const similarity = this.simhashComparator.similarity(page.contentHash, comparePage.contentHash);
        if (similarity === 1) {
          this.addToDuplicateMap(duplicates, page.pageUrlRelative, comparePage.pageUrlRelative);
          this.addToDuplicateMap(duplicates, comparePage.pageUrlRelative, page.pageUrlRelative);
        } else if (similarity >= 0.9) { // Adjust this threshold as needed
          this.addToDuplicateMap(nearDuplicates, page.pageUrlRelative, comparePage.pageUrlRelative);
          this.addToDuplicateMap(nearDuplicates, comparePage.pageUrlRelative, page.pageUrlRelative);
        }
      }
    }

    await this.crawlingSessionService.updateDuplicateContent(crawlingId, duplicates, nearDuplicates);
  }

  private addToDuplicateMap(map: Map<string, string[]>, key: string, value: string): void {
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(value);
  }

  private async performRegularCrawl(crawlingId: string, url: string, crawlConfig: any, asyncConfig: any): Promise<any> {
    let urlsToVisit: { url: string; priority: number }[] = [];

    if (crawlConfig.sitemapEnabled !== false) {
      const sitemaps = await this.sitemapCrawlerService.discoverSitemaps(url);
      const sitemapUrlPromises = sitemaps.map(sitemap => this.sitemapCrawlerService.fetchSitemap(sitemap));
      const sitemapUrls = await Promise.all(sitemapUrlPromises);
      urlsToVisit = sitemapUrls.flat().map(url => ({ url, priority: 1 }));
    }

    if (!urlsToVisit.some(item => item.url === url)) {
      urlsToVisit.unshift({ url, priority: 1 });
    }

    return this.distributeCrawlTasks(crawlingId, urlsToVisit, crawlConfig, asyncConfig);
  }

  private async distributeCrawlTasks(crawlingId: string, urlsToVisit: { url: string; priority: number }[], crawlConfig: any, asyncConfig: any): Promise<any> {
    const { concurrencyLimit, asyncBatchSize } = asyncConfig;
    const { Sema } = await import('async-sema');
    const sema = new Sema(parseInt(concurrencyLimit));
    const taskQueue = urlsToVisit.slice(0, crawlConfig.urlLimit);
    const processedUrls = new Set<string>();
    let processedCount = 0;
  
    const config = this.crawlerConfigService.getCrawlerConfig();
    let batchCount = 0;
  
    while (taskQueue.length > 0 && processedCount < crawlConfig.urlLimit) {
      const batch = taskQueue.splice(0, asyncBatchSize).filter(({ url }) => !processedUrls.has(url));
      
      const tasks = batch.map(({ url }) => {
        processedUrls.add(url);
     return async () => {
            await sema.acquire();
            try {
                const startTime = Date.now();
                const result = await this.crawlAndExtractWithWorker(crawlingId, url, 0, crawlConfig);
                const endTime = Date.now();
                this.performanceMonitorService.recordResponseTime(endTime - startTime);
                this.performanceMonitorService.incrementMetric('totalRequests');
                if (result.error) {
                    this.performanceMonitorService.incrementMetric('failedRequests');
                } else {
                    this.performanceMonitorService.incrementMetric('successfulRequests');
                }
                return result;
            } finally {
                sema.release();
            }
        };
      });
      const results = await Promise.all(tasks.map(task => task()));
  
      processedCount += batch.length;
      const siteKeywords = await this.siteKeywordAnalyzerService.analyzeSiteKeywords(results);
      siteKeywords.forEach(keyword => this.accumulatedKeywords.add(keyword));
      await this.crawlingSessionService.updateExtractedKeywords(this.crawlingSessionServiceId, Array.from(this.accumulatedKeywords));
      for (const result of results) {
        if (result.pageData) {
          await this.queueData(result.pageData);
        }
        // Handle newUrls if needed
      }

      const newUrls = results.filter(Boolean).flatMap(result => result?.newUrls || []);
      const processedBatchUrls = results.filter(result => result?.pageData?.pageUrlRelative).map(result => result.pageData.pageUrlRelative);
      const percentage = this.progressService.updateProgress(crawlingId, newUrls, this.processedUrls);
      batchCount++;
  
      if (batchCount >= config.batchUpdateSize) {
        const lastProcessedUrl = processedBatchUrls[processedBatchUrls.length - 1] || 'Unknown';
        this.emitProgress(crawlingId, percentage, lastProcessedUrl);
        batchCount = 0;
      }
  
      if (processedCount < crawlConfig.urlLimit) {
        const uniqueNewUrls = newUrls.filter(url => !processedUrls.has(url));
        taskQueue.push(...uniqueNewUrls.map(url => ({ url, priority: 0 })));
      }

      this.performanceMonitorService.updatePeakMemoryUsage();
    }
  
    const finalPercentage = this.progressService.updateProgress(crawlingId, [], this.processedUrls);
    this.emitProgress(crawlingId, finalPercentage, 'Completed');
  
    return { crawlingId };
  }

  getAccumulatedKeywords(): string[] {
    return Array.from(this.accumulatedKeywords);
  }

  private async crawlAndExtractWithWorker(crawlingId: string, url: string, depth: number, crawlConfig: any): Promise<any> {
    const worker = this.getAvailableWorker();
    this.activeWorkers++;
   
    return new Promise((resolve, reject) => {
      worker.postMessage({ type: 'crawlAndExtract', crawlingId, url, depth, crawlConfig });
      worker.once('message', (result) => {
        this.activeWorkers--;
        if (result.error) {
          this.performanceMonitorService.incrementMetric('failedRequests');
          console.error('Error in worker:', result.error);
        } else {
          this.performanceMonitorService.incrementMetric('successfulRequests');
          if (result.pageData && result.pageData.canonicalTagAnalysis) {
            this.canonicalData.push({
                url: result.pageData.pageUrlRelative,
                canonicalHref: result.pageData.canonicalTagAnalysis.href
            });
          }
          resolve(result);
          this.processedUrls++;
        }
        resolve(result);
      });
    });
  }

  private getAvailableWorker(): Worker {
    const worker = this.workers.shift();
    this.workers.push(worker);
    return worker;
  }

  private emitProgress(crawlingId: string, percentage: number, currentUrl: string) {
    this.eventEmitter.emit('crawling.progress', { crawlingId, percentage, currentUrl });
  }

  private async initiateCrawlingSession(domain: string): Promise<CrawlingSession> {
    let session = await this.crawlingSessionModel.findOne({ websiteDomain: domain }).exec();
    if (!session) {
      session = new this.crawlingSessionModel({
        crawlingId: this.generateCrawlingId(domain),
        websiteDomain: domain,
      });
      await session.save();
    }
    return session;
  }

  private generateCrawlingId(domain: string): string {
    return `crawl_${domain.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  private async crawlDirectoryTree(crawlingId: string, rootPath: string, crawlConfig: any): Promise<any> {
    const worker = this.getAvailableWorker();
    this.activeWorkers++;

    return new Promise((resolve, reject) => {
      worker.postMessage({ type: 'directoryTree', crawlingId, rootPath, crawlConfig });
      worker.once('message', (result) => {
        this.activeWorkers--;

        if (result.error) {
          this.performanceMonitorService.incrementMetric('failedRequests');
          reject(new Error(result.error));
        } else {
          this.performanceMonitorService.incrementMetric('successfulRequests');
          resolve(result);
        }
      });
    });
  }

  private async crawlSpecificUrlList(crawlingId: string, urlList: string[], crawlConfig: any): Promise<any> {
    const urlsToVisit = urlList.map(url => ({ url, priority: 1 }));
    return this.distributeCrawlTasks(crawlingId, urlsToVisit, crawlConfig, this.crawlerConfigService.getAsyncOperationsConfig());
  }

  private async queueData(data: any): Promise<void> {
    this.dataQueue.push(data);
    if (this.dataQueue.length >= this.batchSize) {
      await this.processBatch();
    }
  }

  private async processBatch(): Promise<void> {
    if (this.dataQueue.length === 0) return;

    const batch = this.dataQueue.splice(0, this.batchSize);
    try {
      await this.crawlingDataRepository.bulkUpdateCrawlingData(batch);
    } catch (error) {
      this.logger.error(`Error processing batch: ${error.message}`);
    }
  }
}
