import { ConfigService } from '@nestjs/config';
import { getNumberConfig, getStringConfig, getBooleanConfig, getArrayConfig } from '../utils/config-helpers';

export class GeneralConfig {
  constructor(private configService: ConfigService) {}

  getConfig() {
    return {
      defaultUrlLimit: getNumberConfig(this.configService, 'CRAWLER_DEFAULT_URL_LIMIT', 1000),
      defaultDepthLimit: getNumberConfig(this.configService, 'CRAWLER_DEFAULT_DEPTH_LIMIT', 5),
      userAgent: getStringConfig(this.configService, 'CRAWLER_USER_AGENT', 'SeoOptimizer Crawler/1.0'),
      respectRobotsTxt: getBooleanConfig(this.configService, 'CRAWLER_RESPECT_ROBOTS_TXT', true),
      crawlDelay: getNumberConfig(this.configService, 'CRAWLER_CRAWL_DELAY', 1000),
      followInternalLinks: getBooleanConfig(this.configService, 'CRAWLER_FOLLOW_INTERNAL_LINKS', true),
      followExternalLinks: getBooleanConfig(this.configService, 'CRAWLER_FOLLOW_EXTERNAL_LINKS', false),
      followSubfolderLinks: getBooleanConfig(this.configService, 'CRAWLER_FOLLOW_SUBFOLDER_LINKS', true),
    };
  }
}
