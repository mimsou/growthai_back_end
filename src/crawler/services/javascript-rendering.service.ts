import { Injectable, Logger } from '@nestjs/common';
import { CrawlerConfigService } from '../config/crawler-config.service';
import * as puppeteer from 'puppeteer';

@Injectable()
export class JavaScriptRenderingService {
  private readonly logger = new Logger(JavaScriptRenderingService.name);
  private browser: puppeteer.Browser;

  constructor(private readonly crawlerConfigService: CrawlerConfigService) {}

  async init() {
    if(!!this.crawlerConfigService.getJavaScriptRenderingConfig().enabled) return
    try {
        this.browser = await puppeteer.launch({ headless: true });
        this.logger.log('Browser initialized successfully');
      } catch (error) {
        this.logger.error(`Failed to initialize browser: ${error.message}`);
        throw error;
      }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async renderPage(url: string): Promise<string> {

    const config = this.crawlerConfigService.getJavaScriptRenderingConfig();

    if(!!config.enabled){
      return null;
    }

    const page = await this.browser.newPage();

    try {
      await page.setUserAgent(config.userAgent);
      console.log({
        width: Math.floor(config.viewport.width),
        height: Math.floor(config.viewport.height),
        deviceScaleFactor: parseInt(config.viewport.deviceScaleFactor),
      });
      await page.setViewport({
        width: Math.floor(config.viewport.width),
        height: Math.floor(config.viewport.height),
        deviceScaleFactor: parseInt(config.viewport.deviceScaleFactor),
      });

      await page.goto(url, {
        waitUntil: config.waitUntil as puppeteer.WaitForOptions['waitUntil'],
        timeout: config.timeout,
      });

      // Wait for any remaining network connections to finish
      await page.waitForNetworkIdle({ timeout: config.timeout });

      // Execute any additional JavaScript if needed
      // await page.evaluate(() => { ... });

      const content = await page.content();
      return content;
    } catch (error) {
      this.logger.error(`Error rendering page ${url}: ${error.message}`);
      throw error;
    } finally {
      await page.close();
    }
  }

  async extractAjaxedContent(url: string): Promise<any> {
    const page = await this.browser.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle0' });
      
      // Example: Extract content from a specific element that's loaded via AJAX
      const ajaxedContent = await page.evaluate(() => {
        const element = document.querySelector('#ajax-loaded-content');
        return element ? element.textContent : null;
      });

      return ajaxedContent;
    } finally {
      await page.close();
    }
  }

  async crawlSPA(url: string): Promise<any> {
    const page = await this.browser.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle0' });

      // Example: Extract all links from the SPA
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a')).map(a => a.href);
      });

      // Example: Navigate through the SPA and extract content
      const content = [];
      for (const link of links) {
        await page.goto(link, { waitUntil: 'networkidle0' });
        const pageContent = await page.evaluate(() => document.body.innerText);
        content.push({ url: link, content: pageContent });
      }

      return content;
    } finally {
      await page.close();
    }
  }
}
