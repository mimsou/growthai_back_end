import { ConfigService } from '@nestjs/config';
import { getBooleanConfig, getArrayConfig, getNumberConfig, getStringConfig } from '../utils/config-helpers';

export class SitemapConfig {
  constructor(private configService: ConfigService) {}

  getConfig() {
    return {
      sitemapEnabled: getBooleanConfig(this.configService, 'CRAWLER_SITEMAP_ENABLED', true),
      sitemapTypes: getArrayConfig(this.configService, 'CRAWLER_SITEMAP_TYPES', ['xml', 'rss', 'atom', 'txt']),
      sitemapLimit: getNumberConfig(this.configService, 'CRAWLER_SITEMAP_LIMIT', 1000),
      sitemapPriority: getStringConfig(this.configService, 'CRAWLER_SITEMAP_PRIORITY', 'high'),
      extractSitemapsFromRobots: getBooleanConfig(this.configService, 'CRAWLER_EXTRACT_SITEMAPS_FROM_ROBOTS', true),
      extractSitemapsFromHtml: getBooleanConfig(this.configService, 'CRAWLER_EXTRACT_SITEMAPS_FROM_HTML', true),
    };
  }
}
