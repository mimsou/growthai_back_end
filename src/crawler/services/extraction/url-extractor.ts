import * as cheerio from 'cheerio';
import { Injectable } from '@nestjs/common';
import { CrawlerConfigService } from '../../config/crawler-config.service';
import { RobotsTxtService } from '../robot/robots-txt.service';
import { InclusionExclusionService } from '../../config/inclusion-exclusion.service';

@Injectable()
export class UrlExtractor {
  constructor(
    private crawlerConfigService: CrawlerConfigService,
    private robotsTxtService: RobotsTxtService,
    private inclusionExclusionService: InclusionExclusionService
  ) {}

  async extractLinks($: cheerio.CheerioAPI, url: string, currentDepth: number, crawlConfig: any): Promise<string[]> {
    const baseUrl = new URL(url);
    const validExtensions = new Set(['', '.html', '.htm', '.php', '.asp', '.aspx']);

    const newUrls = $('a').map((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        try {
          const newUrl = new URL(href, baseUrl.origin);
          const pathname = newUrl.pathname.toLowerCase();
          const extension = pathname.substring(pathname.lastIndexOf('.'));

          if (this.shouldFollowLink(newUrl, baseUrl, crawlConfig) &&
              (validExtensions.has(extension) || !pathname.includes('.')) &&
              this.inclusionExclusionService.isUrlAllowed(newUrl.href)) {
            return newUrl.href;
          }
        } catch {
          // Invalid URL, ignore
        }
      }
      return null;
    }).get().filter(Boolean);

    const uniqueUrls = [...new Set(newUrls)];
    const allowedUrls = await this.filterAllowedUrls(uniqueUrls);

    return allowedUrls;
  }

  private shouldFollowLink(newUrl: URL, baseUrl: URL, config: any): boolean {
    if (newUrl.hostname === baseUrl.hostname) {
      if (newUrl.pathname.startsWith(baseUrl.pathname)) {
        return config.followSubfolderLinks;
      }
      return config.followInternalLinks;
    }
    return config.followExternalLinks;
  }

  private async filterAllowedUrls(urls: string[]): Promise<string[]> {
    const allowedUrls = await Promise.all(
      urls.map(async (url) => {
        const isAllowed = await this.robotsTxtService.isAllowed(url);
        return isAllowed ? url : null;
      })
    );
    return allowedUrls.filter(Boolean);
  }

  async extractSitemapUrlsFromRobotsTxt(url: string): Promise<string[]> {
    const config = this.crawlerConfigService.getCrawlerConfig();
    if (!config.extractSitemapsFromRobots) {
      return [];
    }

    try {
      const robotsTxtUrl = new URL('/robots.txt', url).toString();
      const robotsTxtContent = await this.robotsTxtService.fetchRobotsTxt(robotsTxtUrl);
      const sitemapUrls = robotsTxtContent.match(/Sitemap: (.*)/gi);
      return sitemapUrls ? sitemapUrls.map(line => line.split(': ')[1]) : [];
    } catch (error) {
      console.error(`Error extracting sitemap URLs from robots.txt: ${error.message}`);
      return [];
    }
  }

  async extractSitemapUrlsFromHtml($: cheerio.CheerioAPI, url: string): Promise<string[]> {
    const config = this.crawlerConfigService.getCrawlerConfig();
    if (!config.extractSitemapsFromHtml) {
      return [];
    }

    const sitemapUrls: string[] = [];

    // Check for sitemap links in the HTML
    $('a[href*="sitemap"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        sitemapUrls.push(new URL(href, url).toString());
      }
    });

    // Check for sitemap references in meta tags
    $('meta[name="sitemap"]').each((_, el) => {
      const content = $(el).attr('content');
      if (content) {
        sitemapUrls.push(new URL(content, url).toString());
      }
    });

    return [...new Set(sitemapUrls)];
  }
}
