import { ConfigService } from '@nestjs/config';
import { getNumberConfig, getBooleanConfig } from '../utils/config-helpers';

export class MultithreadingConfig {
  constructor(private configService: ConfigService) {}

  getConfig() {
    return {
      enableMultithreading: getBooleanConfig(this.configService, 'CRAWLER_ENABLE_MULTITHREADING', true),
      maxThreads: getNumberConfig(this.configService, 'CRAWLER_MAX_THREADS', 4),
      threadPoolSize: getNumberConfig(this.configService, 'CRAWLER_THREAD_POOL_SIZE', 10),
    };
  }
}
