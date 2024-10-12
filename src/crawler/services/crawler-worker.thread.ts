import { parentPort, workerData } from 'worker_threads';
import { CrawlerWorker } from './crawler-worker.service';
import { CrawlingDataRepository } from '../repository/crawling-data.repository';
import { CrawlerConfigService } from '../config/crawler-config.service';
import { RobotsTxtService } from './robot/robots-txt.service';
import { InclusionExclusionService } from '../config/inclusion-exclusion.service';
import { DirectoryTreeAnalyzer } from './analysis/directory-tree-analyzer';
import { DirectoryTreeCrawlerService } from './directory-tree/directory-tree-crawler.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CrawlingData, CrawlingDataSchema } from '../schemas/crawling-data.schema';
import { Model, Connection, createConnection } from 'mongoose';

// Initialize MongoDB connection
const connection: Connection = createConnection("mongodb://localhost:27017/seopt");

// Initialize ConfigModule
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: '.env',
});

// Create Mongoose model
const crawlingDataModel: Model<CrawlingData> = connection.model<CrawlingData>('CrawlingData', CrawlingDataSchema);

// Create instances of required services
const crawlingDataRepository = new CrawlingDataRepository(crawlingDataModel);
const configService = new ConfigService();
const crawlerConfigService = new CrawlerConfigService(configService, new InclusionExclusionService());
const robotsTxtService = new RobotsTxtService(configService);
const inclusionExclusionService = new InclusionExclusionService();
const directoryTreeAnalyzer = new DirectoryTreeAnalyzer();
const directoryTreeCrawlerService = new DirectoryTreeCrawlerService(crawlerConfigService);

// Initialize CrawlerWorker with injected dependencies
const crawlerWorker = new CrawlerWorker(
  crawlingDataRepository,
  crawlerConfigService,
  robotsTxtService,
  inclusionExclusionService,
  directoryTreeAnalyzer,
  directoryTreeCrawlerService
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
