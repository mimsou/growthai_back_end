import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { CrawlerController } from './crawler.controller';
import { CrawlerService } from '../services/crawler.service';
import { CrawlerGateway } from './crawler.gateway';
import { CrawlingSession, CrawlingSessionSchema } from '../schemas/crawling-session.schema';
import { CrawlingData, CrawlingDataSchema } from '../schemas/crawling-data.schema';
import { SitemapModule } from '../../seo/sitemap/sitemap.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ContentExtractor } from '../services/extraction/content-extractor';
import { SEOAnalyzer } from '../services/analysis/seo-analyzer';
import { UrlExtractor } from '../services/extraction/url-extractor';
import { CrawlingDataRepository } from '../repository/crawling-data.repository';
import { CrawlerConfigService } from '../config/crawler-config.service';
import { RobotsTxtService } from '../services/robot/robots-txt.service';
import { InclusionExclusionService } from '../config/inclusion-exclusion.service';
import { SitemapCrawlerService } from '../services/sitemap/sitemap-crawler.service';
import { SitemapParser } from '../services/sitemap/sitemap-parser';
import { DirectoryTreeCrawlerService } from '../services/directory-tree/directory-tree-crawler.service';
import { DirectoryTreeAnalyzer } from '../services/analysis/directory-tree-analyzer';
import { CrawlerWorker } from '../services/crawler-worker.service';
import { AsyncHttpService } from '../services/async-http.service';
import { ProgressService } from '../services/progress.service';
import { RateLimiterService } from '../services/rate-limiter.service';
import { PerformanceMonitorService } from '../services/performance-monitor.service';
import { QueuedTask, QueuedTaskSchema } from '../schemas/queued-task.schema';
import { UrlAnalyzerService } from '../services/analysis/url-analyzer.service';
import { HttpHeaderService } from '../services/analysis/http-header.service';
import { ContentTypeAnalyzerService } from '../services/analysis/content-type-analyzer.service';
import { OnPageElementService } from '../services/analysis/on-page-element.service';
import { SiteKeywordAnalyzerService } from '../services/analysis/site-keyword-analyzer.service';
import { CrawlingSessionService } from '../services/crawling-session.service';
import { KeywordExtractionService } from '../services/analysis/keyword-extraction.service';
import { ContentAnalysisService } from '../services/analysis/content-analysis.service';
import { ImageAnalysisService } from '../services/analysis/image-analysis.service';
import { JavaScriptRenderingService } from '../services/javascript-rendering.service';
import { JavaRenderingScriptAnalysisService } from '../services/analysis/java-rendering-script-analysis.service';
import { TechnicalSeoAnalysisService } from '../services/analysis/technical-seo-analysis.service';
import { TechnicalMobileAnalysisService } from '../services/analysis/technical-mobile-analysis.service';
import { AmpAnalysisService } from '../services/analysis/amp-analysis.service';
import { ResourceUsageAnalysisService } from '../services/analysis/resource-usage-analysis.service';
import { CookieAnalysisService } from '../services/analysis/cookie-analysis.service';
import { StructuredDataAnalysisService } from '../services/analysis/structured-data-analysis.service';


  @Module({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env',
      }),
      MongooseModule.forRootAsync({
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          uri: configService.get<string>('DATABASE_URL'),
          useNewUrlParser: true,
          useUnifiedTopology: true,
          maxPoolSize: configService.get<number>('MONGO_POOL_SIZE', 10),
          maxIdleTimeMS: configService.get<number>('MONGO_MAX_IDLE_TIME_MS', 30000),
          connectTimeoutMS: configService.get<number>('MONGO_CONNECT_TIMEOUT_MS', 30000),
        }),
        inject: [ConfigService],
      }),
      MongooseModule.forFeature([
        { name: CrawlingSession.name, schema: CrawlingSessionSchema },
        { name: CrawlingData.name, schema: CrawlingDataSchema },
        { name: QueuedTask.name, schema: QueuedTaskSchema },
      ]),
      CacheModule.register(),
      SitemapModule,
      EventEmitterModule.forRoot(),
      HttpModule,
    ],
    controllers: [CrawlerController],
    providers: [
      CrawlerService,
      CrawlerGateway,
      ContentExtractor,
      SEOAnalyzer,
      UrlExtractor,
      CrawlingDataRepository,
      CrawlerConfigService,
      RobotsTxtService,
      InclusionExclusionService,
      SitemapCrawlerService,
      SitemapParser,
      DirectoryTreeCrawlerService,
      DirectoryTreeAnalyzer,
      CrawlerWorker,
      AsyncHttpService,
      ProgressService,
      RateLimiterService,
      PerformanceMonitorService,
      UrlAnalyzerService,
      HttpHeaderService,
      ContentTypeAnalyzerService,
      OnPageElementService,
      SiteKeywordAnalyzerService,
      CrawlingSessionService,
      KeywordExtractionService,
      ContentAnalysisService,
      ImageAnalysisService,
      JavaScriptRenderingService,
      JavaRenderingScriptAnalysisService,
      TechnicalSeoAnalysisService,
      TechnicalMobileAnalysisService,
      AmpAnalysisService,
      ResourceUsageAnalysisService,
      CookieAnalysisService,
      StructuredDataAnalysisService,
    ],
    exports: [CrawlerService, UrlAnalyzerService, ImageAnalysisService,TechnicalMobileAnalysisService,
      AmpAnalysisService,
      ResourceUsageAnalysisService,
      CookieAnalysisService,],
  })
export class CrawlerModule {} 