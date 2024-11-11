import { ConfigService } from '@nestjs/config';
import { getNumberConfig, getBooleanConfig } from '../utils/config-helpers';

export class AsyncOperationsConfig {
  constructor(private configService: ConfigService) {}

  getConfig() {
    return {
      concurrencyLimit: getNumberConfig(this.configService, 'CRAWLER_ASYNC_CONCURRENCY_LIMIT', 10),
      useAsyncHttpRequests: getBooleanConfig(this.configService, 'CRAWLER_USE_ASYNC_HTTP_REQUESTS', true),
      asyncBatchSize: getNumberConfig(this.configService, 'CRAWLER_ASYNC_BATCH_SIZE', 5),
      asyncTimeout: getNumberConfig(this.configService, 'CRAWLER_ASYNC_TIMEOUT', 30000),
    };
  }
}
