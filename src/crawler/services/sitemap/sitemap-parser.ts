import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as xml2js from 'xml2js';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gunzip = promisify(zlib.gunzip);

@Injectable()
export class SitemapParser {
  private maxUrls: number;
  private timeout: number;

  constructor(private configService: ConfigService) {
    this.maxUrls = this.configService.get<number>('SITEMAP_PARSER_MAX_URLS', 50000);
    this.timeout = this.configService.get<number>('SITEMAP_PARSER_TIMEOUT', 30000);
  }

  async parse(url: string): Promise<string[]> {
    const response = await this.fetchSitemap(url);
    const content = await this.decompressIfNeeded(response);

    if (this.isXmlSitemap(content)) {
      return this.parseXmlSitemap(content);
    } else if (this.isTextSitemap(content)) {
      return this.parseTextSitemap(content);
    } else {
      throw new Error('Unsupported sitemap format');
    }
  }

  private async fetchSitemap(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: this.timeout,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch sitemap: ${error.message}`);
    }
  }

  private async decompressIfNeeded(content: string | Buffer): Promise<string> {
    if (content instanceof Buffer && content[0] === 0x1f && content[1] === 0x8b) {
      const decompressed = await gunzip(content);
      return decompressed.toString('utf-8');
    }
    return content.toString('utf-8');
  }

  private isXmlSitemap(content: string): boolean {
    return content.trim().startsWith('<?xml') || content.trim().startsWith('<urlset') || content.trim().startsWith('<sitemapindex');
  }

  private isTextSitemap(content: string): boolean {
    const lines = content.trim().split('\n');
    return lines.every(line => line.trim().startsWith('http'));
  }

  private async parseXmlSitemap(content: string): Promise<string[]> {
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(content);

    if (result.sitemapindex) {
      return this.parseSitemapIndex(result.sitemapindex);
    } else if (result.urlset) {
      return this.parseUrlset(result.urlset);
    } else {
      throw new Error('Invalid XML sitemap format');
    }
  }

  private async parseSitemapIndex(sitemapindex: any): Promise<string[]> {
    const urls: string[] = [];
    for (const sitemap of sitemapindex.sitemap) {
      if (urls.length >= this.maxUrls) break;
      const sitemapUrl = sitemap.loc[0];
      const sitemapUrls = await this.parse(sitemapUrl);
      urls.push(...sitemapUrls.slice(0, this.maxUrls - urls.length));
    }
    return urls;
  }

  private parseUrlset(urlset: any): string[] {
    return urlset.url
      .map((url: any) => url.loc[0])
      .slice(0, this.maxUrls);
  }

  private parseTextSitemap(content: string): string[] {
    return content
      .trim()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('http'))
      .slice(0, this.maxUrls);
  }
}
