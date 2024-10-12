import { Injectable } from '@nestjs/common';
import { CrawlerConfigService } from '../../config/crawler-config.service';
import axios from 'axios';
import * as xml2js from 'xml2js';
import * as cheerio from 'cheerio';

@Injectable()
export class SitemapCrawlerService {
  constructor(private readonly crawlerConfigService: CrawlerConfigService) {}

  async discoverSitemaps(url: string): Promise<string[]> {
    const config = this.crawlerConfigService.getCrawlerConfig();
    const baseUrl = new URL(url).origin;
    const sitemaps: string[] = [];

    // Check robots.txt for sitemaps
    const robotsTxtUrl = `${baseUrl}/robots.txt`;
    try {
      const robotsTxtResponse = await axios.get(robotsTxtUrl);
      const robotsTxtContent = robotsTxtResponse.data;
      const sitemapUrls = robotsTxtContent.match(/Sitemap: (.*)/gi);
      if (sitemapUrls) {
        sitemaps.push(...sitemapUrls.map(line => line.split(': ')[1]));
      }
    } catch (error) {
      console.error(`Error fetching robots.txt: ${error.message}`);
    }

    // Check common sitemap locations
    const commonSitemapPaths = [
      '/sitemap.xml',
      '/sitemap_index.xml',
      '/sitemap.txt',
      '/sitemap.rss',
      '/sitemap.atom',
    ];

    for (const path of commonSitemapPaths) {
      const sitemapUrl = `${baseUrl}${path}`;
      try {
        await axios.head(sitemapUrl);
        sitemaps.push(sitemapUrl);
      } catch (error) {
        // Sitemap not found at this location, continue to next
      }
    }

    return sitemaps;
  }

  async fetchSitemap(url: string): Promise<string[]> {
    const config = this.crawlerConfigService.getCrawlerConfig();
    const response = await axios.get(url, {
      headers: { 'User-Agent': config.userAgent },
    });

    const contentType = response.headers['content-type'];
    if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      return this.parseXmlSitemap(response.data);
    } else if (contentType.includes('text/plain')) {
      return this.parseTxtSitemap(response.data);
    } else if (contentType.includes('application/rss+xml')) {
      return this.parseRssSitemap(response.data);
    } else if (contentType.includes('application/atom+xml')) {
      return this.parseAtomSitemap(response.data);
    } else {
      throw new Error(`Unsupported sitemap format: ${contentType}`);
    }
  }

  private async parseXmlSitemap(content: string): Promise<string[]> {
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(content);
    const urls: string[] = [];

    if (result.sitemapindex) {
      // This is a sitemap index
      for (const sitemap of result.sitemapindex.sitemap) {
        const nestedUrls = await this.fetchSitemap(sitemap.loc[0]);
        urls.push(...nestedUrls);
      }
    } else if (result.urlset) {
      // This is a regular sitemap
      for (const url of result.urlset.url) {
        urls.push(url.loc[0]);
      }
    }

    return urls;
  }

  private parseTxtSitemap(content: string): string[] {
    return content.split('\n').filter(line => line.trim().startsWith('http'));
  }

  private async parseRssSitemap(content: string): Promise<string[]> {
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(content);
    return result.rss.channel[0].item.map(item => item.link[0]);
  }

  private async parseAtomSitemap(content: string): Promise<string[]> {
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(content);
    return result.feed.entry.map(entry => entry.link[0].$.href);
  }
}
