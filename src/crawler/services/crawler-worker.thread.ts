import { parentPort, workerData } from 'worker_threads';
import { CrawlerWorker } from './crawler-worker.service';
import { CrawlingDataRepository } from '../repository/crawling-data.repository';
import { CrawlerConfigService } from '../config/crawler-config.service';
import { RobotsTxtService } from './robot/robots-txt.service';
import { InclusionExclusionService } from '../config/inclusion-exclusion.service';
import { DirectoryTreeAnalyzer } from './analysis/directory-tree-analyzer';
import { DirectoryTreeCrawlerService } from './directory-tree/directory-tree-crawler.service';
import { AsyncHttpService } from './async-http.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CrawlingData, CrawlingDataSchema } from '../schemas/crawling-data.schema';
import { Model, Connection, createConnection } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { RateLimiterService } from './rate-limiter.service'; 
import { Cache, Store  } from 'cache-manager';
import { EventEmitter } from 'stream';
import { UrlAnalyzerService } from './analysis/url-analyzer.service';
import { HttpHeaderService } from './analysis/http-header.service';
import { ContentTypeAnalyzerService } from './analysis/content-type-analyzer.service';
import { OnPageElementService } from './analysis/on-page-element.service';
import { CrawlingSessionService } from './crawling-session.service';
import {CrawlingSession, CrawlingSessionSchema } from '../schemas/crawling-session.schema';
import { ContentAnalysisService } from './analysis/content-analysis.service';
import { ImageAnalysisService } from './analysis/image-analysis.service';
import { JavaRenderingScriptAnalysisService } from './analysis/java-rendering-script-analysis.service';
import { JavaScriptRenderingService } from './javascript-rendering.service';
import { TechnicalSeoAnalysisService } from './analysis/technical-seo-analysis.service';
import { TechnicalMobileAnalysisService } from './analysis/technical-mobile-analysis.service';
import { AmpAnalysisService } from './analysis/amp-analysis.service';
import { ResourceUsageAnalysisService } from './analysis/resource-usage-analysis.service';
import { CookieAnalysisService } from './analysis/cookie-analysis.service';
import { StructuredDataAnalysisService } from './analysis/structured-data-analysis.service';


// Initialize ConfigModule
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: '.env',
});

const mockStore: Store = {
  get: async () => undefined,
  set: async () => undefined,
  del: async () => undefined,
  keys: async () => [],
  ttl: async () => 0,
  reset: async () => undefined,
  mset: async () => undefined,
  mget: async () => [],
  mdel: async () => undefined,
};

const mockCacheManager: Cache = {
  get: async () => undefined,
  set: async () => undefined,
  del: async () => undefined,
  reset: async () => undefined,
  wrap: async () => undefined,
  store: mockStore,
  on: (event: string | symbol, listener: (...args: any[]) => void) => new EventEmitter().on(event, listener),
  removeListener: (event: string | symbol, listener: (...args: any[]) => void) => new EventEmitter().removeListener(event, listener),
}

const configService = new ConfigService();
const connection: Connection = createConnection(configService.get<string>('MONGO_URI'));


// Create Mongoose model
const crawlingDataModel: Model<CrawlingData> = connection.model<CrawlingData>('CrawlingData', CrawlingDataSchema);
const crawlingDataModelSession: Model<CrawlingSession> = connection.model<CrawlingSession>('CrawlingSession', CrawlingSessionSchema);


// Create instances of required services
const crawlingDataRepository = new CrawlingDataRepository(crawlingDataModel, mockCacheManager);

const crawlerConfigService = new CrawlerConfigService(configService, new InclusionExclusionService());
const robotsTxtService = new RobotsTxtService(configService);
const inclusionExclusionService = new InclusionExclusionService();
const directoryTreeAnalyzer = new DirectoryTreeAnalyzer();
const directoryTreeCrawlerService = new DirectoryTreeCrawlerService(crawlerConfigService);
const httpService = new HttpService();
const rateLimiterService = new RateLimiterService(configService);
const contentTypeAnalyzerService = new ContentTypeAnalyzerService(crawlerConfigService);
const httpHeaderService = new HttpHeaderService(crawlerConfigService);


const mobileAnalysisService = new TechnicalMobileAnalysisService(crawlerConfigService);
const ampAnalysisService = new AmpAnalysisService(crawlerConfigService);
const resourceUsageAnalysisService = new ResourceUsageAnalysisService(crawlerConfigService);
const cookieAnalysisService = new CookieAnalysisService(crawlerConfigService);

const  technicalSeoAnalysisService = new TechnicalSeoAnalysisService(crawlerConfigService, mobileAnalysisService, ampAnalysisService, resourceUsageAnalysisService, cookieAnalysisService);
const asyncHttpService = new AsyncHttpService(configService, httpService, rateLimiterService, httpHeaderService, contentTypeAnalyzerService, technicalSeoAnalysisService);
const urlAnalyzerService = new UrlAnalyzerService(crawlerConfigService);
const onPageElementService = new OnPageElementService(crawlerConfigService);
const crawlingSessionService = new CrawlingSessionService(crawlingDataModelSession);
const contentAnalysisService = new ContentAnalysisService(crawlerConfigService);
const imageAnalysisService = new ImageAnalysisService(crawlerConfigService,asyncHttpService);
const javaRenderingScriptAnalysisService = new JavaRenderingScriptAnalysisService(crawlerConfigService);
const javascriptRenderingService = new JavaScriptRenderingService(crawlerConfigService);
const structuredDataAnalysisService = new  StructuredDataAnalysisService(crawlerConfigService);
// Initialize CrawlerWorker with injected dependencies
const crawlerWorker = new CrawlerWorker(
  crawlingDataRepository,
  crawlerConfigService,
  robotsTxtService,
  inclusionExclusionService,
  directoryTreeAnalyzer,
  directoryTreeCrawlerService,
  asyncHttpService,
  urlAnalyzerService,
  httpHeaderService,
  contentTypeAnalyzerService,
  onPageElementService,
  crawlingSessionService,
  contentAnalysisService,
  imageAnalysisService,
  javaRenderingScriptAnalysisService,
  javascriptRenderingService,
  structuredDataAnalysisService

);

if (parentPort) {
  parentPort.on('message', async (message) => {
    try {
      let result;
      switch (message.type) {
        case 'crawlAndExtract':
          result = await crawlerWorker.crawlAndExtract(message.crawlingId, message.url, message.depth, message.crawlConfig);
          break;
        case 'directoryTree':
          result = await crawlerWorker.crawlDirectoryTree(message.crawlingId, message.rootPath, message.crawlConfig);
          break;
        default:
          throw new Error(`Unknown task type: ${message.type}`);
      }
      parentPort.postMessage(result);
    } catch (error) {
      parentPort.postMessage({ error: error.message });
    }
  });
}