import { Controller, Post, Query, Body, ValidationPipe, Get } from '@nestjs/common';
import { CrawlerService } from '../services/crawler.service';
import { CrawlerConfigService } from '../config/crawler-config.service';
import { SpecificUrlListDto } from '../dto/specific-url-list.dto';
import { SitemapCrawlerService } from '../services/sitemap/sitemap-crawler.service';
import { ConfigService } from '@nestjs/config';
import { CrawlOptionsDto } from '../dto/crawl-options.dto';

@Controller('crawler')
export class CrawlerController {
  constructor(
    private readonly crawlerService: CrawlerService,
    private readonly crawlerConfigService: CrawlerConfigService,
    private readonly sitemapCrawlerService: SitemapCrawlerService,
    private readonly configService: ConfigService
  ) {}

  @Post('crawl')
  async crawlWebsite(
    @Body() crawlOptionsDto: CrawlOptionsDto
  ) {
    const {
      url,
      urlLimit,
      depthLimit,
      followInternalLinks,
      followExternalLinks,
      followSubfolderLinks,
      addInclusionRule,
      addExclusionRule,
      removeInclusionRule,
      removeExclusionRule,
      useDirectoryTreeCrawling,
      directoryTreeRootPath,
      specificUrlList,
      customStartingPoints,
      sitemapEnabled
    } = crawlOptionsDto;

    if (addInclusionRule) {
      this.crawlerConfigService.addInclusionRule(addInclusionRule);
    }
    if (addExclusionRule) {
      this.crawlerConfigService.addExclusionRule(addExclusionRule);
    }
    if (removeInclusionRule) {
      this.crawlerConfigService.removeInclusionRule(removeInclusionRule);
    }
    if (removeExclusionRule) {
      this.crawlerConfigService.removeExclusionRule(removeExclusionRule);
    }

    return this.crawlerService.crawlWebsite(url, {
      urlLimit,
      depthLimit,
      followInternalLinks,
      followExternalLinks,
      followSubfolderLinks,
      specificUrlList: specificUrlList?.urls,
      useDirectoryTreeCrawling,
      directoryTreeRootPath,
      customStartingPoints,
      sitemapEnabled
    });
  }

  @Post('crawl-specific-urls')
  async crawlSpecificUrls(
    @Body(new ValidationPipe()) specificUrlListDto: SpecificUrlListDto,
    @Query('urlLimit') urlLimit?: number,
    @Query('depthLimit') depthLimit?: number
  ) {
    return this.crawlerService.crawlWebsite(specificUrlListDto.urls[0], {
      urlLimit,
      depthLimit,
      specificUrlList: specificUrlListDto.urls
    });
  }

  @Get('crawl-sitemap')
  async crawlSitemap(@Query('url') url: string) {
    const sitemaps = await this.sitemapCrawlerService.discoverSitemaps(url);
    const crawlLimit = this.configService.get<number>('MANUAL_SITEMAP_CRAWL_LIMIT', 1000);
    let allUrls: string[] = [];

    for (const sitemap of sitemaps) {
      const urls = await this.sitemapCrawlerService.fetchSitemap(sitemap);
      allUrls = [...allUrls, ...urls];
      if (allUrls.length >= crawlLimit) {
        allUrls = allUrls.slice(0, crawlLimit);
        break;
      }
    }

    return this.crawlerService.crawlWebsite(url, {
      specificUrlList: allUrls,
      urlLimit: crawlLimit
    });
  }

  @Post('crawl-directory-tree')
  async crawlDirectoryTree(
    @Query('rootPath') rootPath: string,
    @Query('urlLimit') urlLimit?: number,
    @Query('depthLimit') depthLimit?: number
  ) {
    return this.crawlerService.crawlWebsite(rootPath, {
      urlLimit,
      depthLimit,
      useDirectoryTreeCrawling: true,
      directoryTreeRootPath: rootPath
    });
  }
}