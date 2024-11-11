import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig, AxiosResponse, AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios';
import { RateLimiterService } from './rate-limiter.service';
import { firstValueFrom } from 'rxjs';
import { RateLimitExceededException, CrawlerNetworkException } from '../exceptions/crawler.exceptions';
import { HttpHeaderService } from './analysis/http-header.service';
import { ContentTypeAnalyzerService } from './analysis/content-type-analyzer.service';
import { TechnicalSeoAnalysisService } from './analysis/technical-seo-analysis.service';
import { JSDOM } from 'jsdom';
import * as cheerio from 'cheerio';


@Injectable()
export class AsyncHttpService {
  private readonly logger = new Logger(AsyncHttpService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly rateLimiterService: RateLimiterService,
    private readonly httpHeaderService: HttpHeaderService,
    private readonly contentTypeAnalyzerService: ContentTypeAnalyzerService,
    private readonly technicalSeoAnalysisService: TechnicalSeoAnalysisService
  ) {}

  async get(url: string, config?: AxiosRequestConfig): Promise<EnhancedAxiosResponse> {
    const startTime = performance.now();
    const resourceTimings = [];
    const resourcePromises = [];
    let loadTime: number;
  
    try {
      await this.rateLimiterService.acquire();
      
      const response = await firstValueFrom(
        this.httpService.get(url, {
          ...config,
          timeout: this.configService.get<number>('CRAWLER_REQUEST_TIMEOUT', 30000),
          headers: {
            ...config?.headers,
            'User-Agent': this.configService.get<string>('CRAWLER_USER_AGENT', 'SeoOptimizerCrawler/1.0'),
          },
          responseType: 'arraybuffer',
          onDownloadProgress: (progressEvent) => {
            loadTime = performance.now();
          }
        })
      );

      const dom = new JSDOM(response.data.toString());
      const document = dom.window.document;
      const $ = cheerio.load(response.data);
      const scripts:any  = document.getElementsByTagName('script');
      for (const script of scripts) {
        if (script.src) {
          resourcePromises.push(this.trackResource(script.src, 'javascript', resourceTimings));
        }
      }
  
      // Track CSS resources
      const styles:any[]  = document.getElementsByTagName('link');
      for (const style of styles) {
        if (style.rel === 'stylesheet') {
          resourcePromises.push(this.trackResource(style.href, 'stylesheet', resourceTimings));
        }
      }
  
      // Track Images
      const images:any  = document.getElementsByTagName('img');
      for (const img of images) {
        if (img.src) {
          resourcePromises.push(this.trackResource(img.src, 'image', resourceTimings));
        }
      }
  
      // Track Fonts
      const fonts:any = Array.from(styles).filter(style => style.rel === 'preload' && style.as === 'font');
      for (const font of fonts) {
        if (font.href) {
          resourcePromises.push(this.trackResource(font.href, 'font', resourceTimings));
        }
      }

      await Promise.allSettled(resourcePromises);
        
      const timing = {
        startTime,
        ttfb: performance.now(),
        domContentLoadedTime: performance.now(),
        loadTime: loadTime,
        resourceTimings
      };
      
      const stringHeaders = this.convertHeadersToStringRecord(response.headers);
      const contentTypeAnalysis = this.httpHeaderService.analyzeContentType(stringHeaders);
      const mimeTypeAnalysis = this.contentTypeAnalyzerService.analyzeMimeType(contentTypeAnalysis.contentType, url);
      const xRobotsTagAnalysis = this.httpHeaderService.analyzeXRobotsTag(stringHeaders);
  
      // Perform technical SEO analysis
      const performanceMetrics = await this.technicalSeoAnalysisService.analyzePerformance(response, timing);
      const compressionAnalysis = await this.technicalSeoAnalysisService.analyzeCompression(response);
      const http2Analysis = this.technicalSeoAnalysisService.analyzeHttp2(response);
      const pageSizeAnalysis = this.technicalSeoAnalysisService.analyzePageSize(response, timing.resourceTimings);
      const pageTechnicalSeoAnalysis = await this.technicalSeoAnalysisService.analyzePage($.html(), url, stringHeaders);
      return {
        ...response,
        contentTypeAnalysis,
        mimeTypeAnalysis,
        xRobotsTagAnalysis,
        technicalSeoAnalysis: {
          performanceMetrics,
          compressionAnalysis,
          http2Analysis,
          pageSizeAnalysis,
          ...pageTechnicalSeoAnalysis
         }
      }
    } catch (error) {
      this.logger.error(`Error fetching ${url}: ${error.message}`);
      throw new CrawlerNetworkException(`Failed to fetch ${url}: ${error.message}`);
    }
  }

  async post(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    const timeout = this.configService.get<number>('CRAWLER_REQUEST_TIMEOUT', 30000);
    const userAgent = this.configService.get<string>('CRAWLER_USER_AGENT', 'SeoOptimizer Crawler/1.0');

    try {
      await this.rateLimiterService.acquire();
    } catch (error) {
      if (error instanceof RateLimitExceededException) {
        this.logger.warn(`Rate limit exceeded for URL: ${url}. Skipping.`);
        throw error;
      }
    }

    try {
      const response = await firstValueFrom(this.httpService.post(url, data, {
        ...config,
        timeout,
        headers: {
          ...config?.headers,
          'User-Agent': userAgent,
        },
      }));
      return response;
    } catch (error) {
      this.logger.error(`Error posting to ${url}: ${error.message}`);
      throw new CrawlerNetworkException(`Failed to post to ${url}: ${error.message}`);
    }
  }

  private convertHeadersToStringRecord(headers: RawAxiosResponseHeaders | AxiosResponseHeaders): Record<string, string> {
    const stringHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (Array.isArray(value)) {
        stringHeaders[key] = value.join(', ');
      } else if (value !== undefined) {
        stringHeaders[key] = String(value);
      }
    }
    return stringHeaders;
  }

  async head(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    const timeout = this.configService.get<number>('CRAWLER_REQUEST_TIMEOUT', 30000);
    const userAgent = this.configService.get<string>('CRAWLER_USER_AGENT', 'SeoOptimizer Crawler/1.0');

    try {
      await this.rateLimiterService.acquire();
    } catch (error) {
      if (error instanceof RateLimitExceededException) {
        this.logger.warn(`Rate limit exceeded for URL: ${url}. Skipping.`);
        throw error;
      }
    }

    try {
      const response = await firstValueFrom(this.httpService.head(url, {
        ...config,
        timeout,
        headers: {
          ...config?.headers,
          'User-Agent': userAgent,
        },
      }));
      return response;
    } catch (error) {
      this.logger.error(`Error making HEAD request to ${url}: ${error.message}`);
      throw new CrawlerNetworkException(`Failed to make HEAD request to ${url}: ${error.message}`);
    }
  }

  private async trackResource(url: string, type: string, resourceTimings: any[]): Promise<void> {
    const startTime = performance.now();
    try {
      const response = await firstValueFrom(
        this.httpService.head(url, {
          timeout: 5000,
          validateStatus: () => true
        })
      );
      
      const endTime = performance.now();
      resourceTimings.push({
        url,
        type,
        duration: endTime - startTime,
        size: parseInt(response.headers['content-length'] || '0'),
        protocol: response.request.protocol
      });
    } catch (error) {
      this.logger.warn(`Failed to track resource ${url}: ${error.message}`);
    }
  }
}

interface EnhancedAxiosResponse extends AxiosResponse {
  contentTypeAnalysis: {
    contentType: string;
    category: string;
    isAllowed: boolean;
    exceedsMaxSize: boolean;
  };
  mimeTypeAnalysis: {
    declaredMimeType: string;
    detectedMimeType: string;
    mimeTypeMatch: boolean;
    fileExtension: string;
  };
  xRobotsTagAnalysis: XRobotsTagAnalysis;
  technicalSeoAnalysis: {
    performanceMetrics: {
      ttfb: number;
      domLoadTime: number;
      fullLoadTime: number;
      firstContentfulPaint: number;
      speedIndex: number;
      resourceLoadTimes: {
        url: string;
        type: string;
        duration: number;
        size: number;
        protocol: string;
      }[];
    };
    compressionAnalysis: {
      type: string;
      originalSize: number;
      compressedSize: number;
      compressionRatio: number;
      isOptimal: boolean;
      suggestions: string[];
    };
    http2Analysis: {
      enabled: boolean;
      serverPushEnabled: boolean;
      multiplexingUsed: boolean;
      concurrentStreams: number;
      connectionEfficiency: number;
      suggestions: string[];
    };
    pageSizeAnalysis: {
      totalSize: number;
      htmlSize: number;
      resourceSizes: {
        js: number;
        css: number;
        images: number;
        fonts: number;
        other: number;
      };
      exceedsLimits: boolean;
      suggestions: string[];
    };
    mobileFriendlinessAnalysis;
    ampAnalysis;
    resourceUsageAnalysis;
    cookieAnalysis;
    overallScore; 
  };

}

interface XRobotsTagAnalysis {
  present: boolean;
  value?: string;
  directives?: {
    noindex: boolean;
    nofollow: boolean;
    none: boolean;
    noarchive: boolean;
    nosnippet: boolean;
    notranslate: boolean;
    noimageindex: boolean;
    unavailable_after: string | null;
  };
  exceedsMaxLength?: boolean;
}