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

  constructor(
    @InjectModel(CrawlingSession.name) private crawlingSessionModel: Model<CrawlingSession>,
    private readonly sitemapService: SitemapService,
    private eventEmitter: EventEmitter2,
    private crawlingDataRepository: CrawlingDataRepository,
    private crawlerConfigService: CrawlerConfigService,
    private sitemapCrawlerService: SitemapCrawlerService,
  ) {
    this.initializeWorkers();
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
    this.logger.log(`Starting crawl for website: ${url}`);
    const domain = new URL(url).hostname;
    const crawlingSession = await this.initiateCrawlingSession(domain);
    this.logger.log(`Crawling session initiated with ID: ${crawlingSession.crawlingId}`);

    const config = this.crawlerConfigService.getCrawlerConfig();
    const finalUrlLimit = options.urlLimit || config.defaultUrlLimit;
    const finalDepthLimit = options.depthLimit || config.defaultDepthLimit;
    
    this.logger.log(`Crawl limits set - URL limit: ${finalUrlLimit}, Depth limit: ${finalDepthLimit}`);
    this.crawlerConfigService.validateCrawlLimits(finalUrlLimit, finalDepthLimit);

    const crawlConfig = {
      ...config,
      ...options,
      urlLimit: finalUrlLimit,
      depthLimit: finalDepthLimit,
    };

    let result;
    if (options.useDirectoryTreeCrawling && options.directoryTreeRootPath) {
      this.logger.log(`Initiating directory tree crawl from root path: ${options.directoryTreeRootPath}`);
      result = await this.crawlDirectoryTree(crawlingSession.crawlingId, options.directoryTreeRootPath, crawlConfig);
    } else if (options.specificUrlList && options.specificUrlList.length > 0) {
      this.logger.log(`Crawling specific URL list with ${options.specificUrlList.length} URLs`);
      result = await this.crawlSpecificUrlList(crawlingSession.crawlingId, options.specificUrlList, crawlConfig);
    } else {
      result = await this.performRegularCrawl(crawlingSession.crawlingId, url, crawlConfig);
    }

    this.logger.log(`Crawl process completed. Calculating average scores.`);
    const averageScores = await this.crawlingDataRepository.calculateAverageScores(crawlingSession.crawlingId);
    this.eventEmitter.emit('crawling.completed', { crawlingId: crawlingSession.crawlingId, averageScores });

    this.logger.log(`Crawl finished for website: ${url}`);
    return { ...result, averageScores };
  }

  private async performRegularCrawl(crawlingId: string, url: string, crawlConfig: any): Promise<any> {
    let urlsToVisit: { url: string; priority: number }[] = [];

    if (crawlConfig.sitemapEnabled !== false) {
      this.logger.log('Sitemap crawling enabled, discovering sitemaps');
      const sitemaps = await this.sitemapCrawlerService.discoverSitemaps(url);
      const sitemapUrlPromises = sitemaps.map(sitemap => this.sitemapCrawlerService.fetchSitemap(sitemap));
      const sitemapUrls = await Promise.all(sitemapUrlPromises);
      urlsToVisit = sitemapUrls.flat().map(url => ({ url, priority: 1 }));
    }

    if (!urlsToVisit.some(item => item.url === url)) {
      this.logger.log(`Adding initial URL to crawl list: ${url}`);
      urlsToVisit.unshift({ url, priority: 1 });
    }

    return this.distributeCrawlTasks(crawlingId, urlsToVisit, crawlConfig);
  }

  private async crawlDirectoryTree(crawlingId: string, rootPath: string, crawlConfig: any): Promise<any> {
    const worker = this.getAvailableWorker();
    this.activeWorkers++;
    this.logger.log(`Active workers: ${this.activeWorkers}`);
    return new Promise((resolve, reject) => {
      worker.postMessage({ type: 'directoryTree', crawlingId, rootPath, crawlConfig });
      worker.once('message', (result) => {
        this.activeWorkers--;
        this.logger.log(`Active workers: ${this.activeWorkers}`);
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      });
    });
  }

  private async crawlSpecificUrlList(crawlingId: string, urlList: string[], crawlConfig: any): Promise<any> {
    const urlsToVisit = urlList.map(url => ({ url, priority: 1 }));
    return this.distributeCrawlTasks(crawlingId, urlsToVisit, crawlConfig);
  }

  private async distributeCrawlTasks(crawlingId: string, urlsToVisit: { url: string; priority: number }[], crawlConfig: any): Promise<any> {
    const { threadPoolSize } = this.crawlerConfigService.getMultithreadingConfig();
    const taskQueue = urlsToVisit.slice(0, crawlConfig.urlLimit);
    const processedUrls = new Set<string>();
    let processedCount = 0;
    let totalUrlsToProcess = Math.min(taskQueue.length, crawlConfig.urlLimit);
  
    this.logger.debug(`Starting distributeCrawlTasks with crawlingId: ${crawlingId}, urlsToVisit: ${urlsToVisit.length}, crawlConfig: ${JSON.stringify(crawlConfig)}`);
  
    while (taskQueue.length > 0 && processedCount < crawlConfig.urlLimit) {
      const batch = taskQueue.splice(0, threadPoolSize).filter(({ url }) => !processedUrls.has(url));
      this.logger.debug(`Processing batch of ${batch.length} URLs`);
      
      const tasks = batch.map(({ url }) => {
        processedUrls.add(url);
        return this.crawlAndExtractWithWorker(crawlingId, url, 0, crawlConfig);
      });
      const results = await Promise.all(tasks);
  
      processedCount += batch.length;
      this.logger.debug(`Processed ${processedCount} URLs so far`);
      
      if (batch.length > 0) {
        this.emitProgress(crawlingId, processedCount, totalUrlsToProcess, batch[batch.length - 1].url);
      }
  
      if (processedCount < crawlConfig.urlLimit) {
        this.logger.debug(`Adding new URLs to queue`);
        const newUrls = results.flatMap(result => result.newUrls || []);
        const uniqueNewUrls = newUrls.filter(url => !processedUrls.has(url));
        taskQueue.push(...uniqueNewUrls.map(url => ({ url, priority: 0 })));
        totalUrlsToProcess = Math.min(totalUrlsToProcess + uniqueNewUrls.length, crawlConfig.urlLimit);
      }
    }
  
    this.logger.debug(`Finished distributeCrawlTasks, processed ${processedCount} URLs in total`);
    this.emitProgress(crawlingId, processedCount, totalUrlsToProcess, 'Completed');
  
    return { crawlingId };
  }

  private crawlAndExtractWithWorker(crawlingId: string, url: string, depth: number, crawlConfig: any): Promise<any> {
    const worker = this.getAvailableWorker();
    this.activeWorkers++;
    this.logger.log(`Active workers: ${this.activeWorkers}`);
    return new Promise((resolve, reject) => {
      worker.postMessage({ type: 'crawlAndExtract', crawlingId, url, depth, crawlConfig });
      worker.once('message', (result) => {
        this.activeWorkers--;
        this.logger.log(`Active workers: ${this.activeWorkers}`);
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      });
    });
  }

  private getAvailableWorker(): Worker {
    const worker = this.workers.shift();
    this.workers.push(worker);
    return worker;
  }

  private emitProgress(crawlingId: string, processed: number, total: number, currentUrl: string) {
    const percentage = Math.min(100, (processed / total) * 100);
    this.logger.debug(`Crawl progress: ${percentage.toFixed(2)}% - Current URL: ${currentUrl}`);
    this.eventEmitter.emit('crawling.progress', { crawlingId, percentage, currentUrl });
  }

  private async initiateCrawlingSession(domain: string): Promise<CrawlingSession> {
    this.logger.log(`Initiating crawling session for domain: ${domain}`);
    let session = await this.crawlingSessionModel.findOne({ websiteDomain: domain }).exec();
    if (!session) {
      session = new this.crawlingSessionModel({
        crawlingId: this.generateCrawlingId(domain),
        websiteDomain: domain,
      });
      await session.save();
      this.logger.log(`New crawling session created with ID: ${session.crawlingId}`);
    } else {
      this.logger.log(`Existing crawling session found with ID: ${session.crawlingId}`);
    }
    return session;
  }

  private generateCrawlingId(domain: string): string {
    return `crawl_${domain.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }
}