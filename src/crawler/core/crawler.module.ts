import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forFeature([
      { name: CrawlingSession.name, schema: CrawlingSessionSchema },
      { name: CrawlingData.name, schema: CrawlingDataSchema },
    ]),
    SitemapModule,
    EventEmitterModule.forRoot(),
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
  ],
  exports: [CrawlerService],
})
export class CrawlerModule {}