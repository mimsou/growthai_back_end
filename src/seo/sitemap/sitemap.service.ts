import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SitemapData } from './sitemap-data.schema';
import { SeoServiceInterface } from '../seo.interface';
import * as xml2js from 'xml2js';

@Injectable()
export class SitemapService implements SeoServiceInterface {
  constructor(
    @InjectModel(SitemapData.name) private sitemapDataModel: Model<SitemapData>,
  ) {}

  async analyzeSitemap(url: string, auditId: string): Promise<any> {
    const xmlData = await this.getSitemapXmlData(url);
    const htmlData = await this.getSitemapHtmlData(url);
    await this.saveSitemapData(auditId, xmlData, htmlData);
    return { xml: xmlData, html: htmlData };
  }

  async getSitemapXmlData(url: string): Promise<{ exist: boolean; content?: string; urls?: string[] }> {
    const rootUrl = await this.getRootUrl(url);
    const sitemapUrl = `${rootUrl}/sitemap.xml`;
    try {
      const response = await fetch(sitemapUrl);
      if (response.ok && response.headers.get('content-type')?.includes('application/xml')) {
        const content = await response.text();
        const urls = await this.parseSitemapXml(content);
        return {
          exist: true,
          content,
          urls,
        };
      }
    } catch (_) {}
    return {
      exist: false,
    };
  }

  async getSitemapHtmlData(url: string): Promise<{ exist: boolean; content?: string }> {
    const rootUrl = await this.getRootUrl(url);
    const sitemapUrl = `${rootUrl}/sitemap.html`;
    try {
      const response = await fetch(sitemapUrl);
      if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
        const content = await response.text();
        return {
          exist: true,
          content,
        };
      }
    } catch (_) {}
    return {
      exist: false,
    };
  }

  private async getRootUrl(url: string): Promise<string> {
    const parsedUrl = new URL(url);
    return `${parsedUrl.protocol}//${parsedUrl.hostname}`;
  }

  private async parseSitemapXml(content: string): Promise<string[]> {
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(content);
    return result.urlset.url.map(urlObj => urlObj.loc[0]);
  }

  private async saveSitemapData(
    auditId: string, 
    xmlData: { exist: boolean; content?: string; urls?: string[] },
    htmlData: { exist: boolean; content?: string }
  ): Promise<void> {
    const sitemapData = new this.sitemapDataModel({
      auditId,
      xmlExist: xmlData.exist,
      xmlContent: xmlData.content,
      xmlUrls: xmlData.urls,
      htmlExist: htmlData.exist,
      htmlContent: htmlData.content,
    });
    await sitemapData.save();
  }

  public async getData(sessionId: string): Promise<any> {
    try {
      const sitemapData = await this.sitemapDataModel.findOne({ auditId: sessionId }).exec();
      return {
        xml: {
          exist: sitemapData.xmlExist,
          content: sitemapData.xmlContent,
          urls: sitemapData.xmlUrls,
        },
        html: {
          exist: sitemapData.htmlExist,
          content: sitemapData.htmlContent,
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch sitemap data: ${error.message}`);
    }
  }
}
