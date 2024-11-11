import { Injectable, Logger } from '@nestjs/common';
import { CrawlerConfigService } from '../../config/crawler-config.service';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { AxiosResponse } from 'axios';
import { TechnicalMobileAnalysisService } from './technical-mobile-analysis.service';
import { AmpAnalysisService } from './amp-analysis.service';
import { ResourceUsageAnalysisService } from './resource-usage-analysis.service';
import { CookieAnalysisService } from './cookie-analysis.service';



const gzipDecompress = promisify(zlib.gunzip);
const brotliDecompress = promisify(zlib.brotliDecompress);

interface PerformanceMetrics {
  ttfb: number;
  domLoadTime: number;
  fullLoadTime: number;
  firstContentfulPaint: number;
  speedIndex: number;
  resourceLoadTimes: ResourceTiming[];
}

interface ResourceTiming {
  url: string;
  type: string;
  duration: number;
  size: number;
  protocol: string;
}

interface CompressionAnalysis {
  type: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  isOptimal: boolean;
  suggestions: string[];
}

interface Http2Analysis {
  enabled: boolean;
  serverPushEnabled: boolean;
  multiplexingUsed: boolean;
  concurrentStreams: number;
  connectionEfficiency: number;
  suggestions: string[];
}

interface PageSizeAnalysis {
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
}

@Injectable()
export class TechnicalSeoAnalysisService {
  private readonly logger = new Logger(TechnicalSeoAnalysisService.name);
  private config: any;

  constructor(
    private readonly crawlerConfigService: CrawlerConfigService,
    private readonly mobileAnalysisService: TechnicalMobileAnalysisService,
    private readonly ampAnalysisService: AmpAnalysisService,
    private readonly resourceUsageAnalysisService: ResourceUsageAnalysisService,
    private readonly cookieAnalysisService: CookieAnalysisService
  ) {
    this.config = this.crawlerConfigService.getTechnicalSeoConfig();
    
  }

  async analyzePerformance(response: AxiosResponse, timing: any): Promise<PerformanceMetrics> {
    const startTime = timing.startTime || 0;
    const ttfb = timing.ttfb - startTime || 0;
    const domLoadTime = timing.domContentLoadedTime - startTime || 0;
    const fullLoadTime = timing.loadTime - startTime || 0;
    const resourceTimings = this.analyzeResourceTimings(response, timing.resourceTimings || []);

    return {
      ttfb,
      domLoadTime,
      fullLoadTime,
      firstContentfulPaint: this.calculateFirstContentfulPaint(timing),
      speedIndex: this.calculateSpeedIndex(timing),
      resourceLoadTimes: resourceTimings
    };
  }

  private analyzeResourceTimings(response: AxiosResponse, timings: any[]): ResourceTiming[] {
    return timings.map(timing => ({
      url: timing.url,
      type: this.getResourceType(timing.url),
      duration: timing.duration,
      size: timing.size || 0,
      protocol: timing.nextHopProtocol || response.request.protocol
    }));
  }

  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    const typeMap = {
      js: 'javascript',
      css: 'stylesheet',
      jpg: 'image',
      jpeg: 'image',
      png: 'image',
      gif: 'image',
      webp: 'image',
      woff: 'font',
      woff2: 'font',
      ttf: 'font',
      eot: 'font'
    };
    return typeMap[extension] || 'other';
  }

  private calculateFirstContentfulPaint(timing: any): number {
    // Estimate FCP based on available metrics
    return timing.firstContentfulPaint || timing.domContentLoadedTime || 0;
  }

  private calculateSpeedIndex(timing: any): number {
    // Simplified Speed Index calculation
    const visuallyComplete = timing.loadTime || 0;
    return Math.round((timing.firstContentfulPaint + visuallyComplete) / 2);
  }

  async analyzeCompression(response: AxiosResponse): Promise<CompressionAnalysis> {
    const contentEncoding = response.headers['content-encoding'];
    const originalSize = response.data.length;
    let compressedSize = response.headers['content-length'] ? 
      parseInt(response.headers['content-length']) : originalSize;

    const decompressedContent = await this.decompressContent(response.data, contentEncoding);
    const compressionRatio = compressedSize / decompressedContent.length;

    const suggestions = this.generateCompressionSuggestions(
      contentEncoding,
      compressionRatio,
      originalSize
    );

    return {
      type: contentEncoding || 'none',
      originalSize,
      compressedSize,
      compressionRatio,
      isOptimal: compressionRatio <= this.config.compression.minCompressionRatio,
      suggestions
    };
  }

  private async decompressContent(content: Buffer, encoding: string): Promise<Buffer> {
    try {
      switch (encoding?.toLowerCase()) {
        case 'gzip':
          return await gzipDecompress(content);
        case 'br':
          return await brotliDecompress(content);
        default:
          return content;
      }
    } catch (error) {
      this.logger.error(`Error decompressing content: ${error.message}`);
      return content;
    }
  }

  private generateCompressionSuggestions(
    encoding: string,
    ratio: number,
    size: number
  ): string[] {
    const suggestions = [];
    const { minCompressionRatio, preferredEncodings } = this.config.compression;

    if (!encoding) {
      suggestions.push('Enable compression (Gzip or Brotli) for better performance');
    }

    if (encoding && !preferredEncodings.includes(encoding)) {
      suggestions.push(`Consider using ${preferredEncodings[0]} for better compression`);
    }

    if (ratio > minCompressionRatio) {
      suggestions.push('Current compression ratio is suboptimal. Consider adjusting compression settings');
    }

    if (size > 1024 * 1024) {
      suggestions.push('Consider implementing code splitting to reduce payload size');
    }

    return suggestions;
  }

  analyzeHttp2(response: AxiosResponse): Http2Analysis {
    const protocol = response.request.protocol;
    const headers = response.headers;
    const isHttp2 = protocol === 'h2' || headers['x-firefox-spdy'] === 'h2';

    const serverPushEnabled = !!headers['link']?.includes('rel=preload');
    const multiplexingUsed = isHttp2 && this.detectMultiplexing(response);
    const concurrentStreams = this.calculateConcurrentStreams(response);
    const connectionEfficiency = this.calculateConnectionEfficiency(response);

    return {
      enabled: isHttp2,
      serverPushEnabled,
      multiplexingUsed,
      concurrentStreams,
      connectionEfficiency,
      suggestions: this.generateHttp2Suggestions(isHttp2, serverPushEnabled, multiplexingUsed)
    };
  }

  private detectMultiplexing(response: AxiosResponse): boolean {
    // Check for multiplexing indicators in response headers
    return response.headers['x-firefox-spdy'] === 'h2' || 
           response.headers['x-http2-stream-id'] !== undefined;
  }

  private calculateConcurrentStreams(response: AxiosResponse): number {
    // Estimate concurrent streams from response headers
    const streamId = response.headers['x-http2-stream-id'];
    return streamId ? parseInt(streamId) : 1;
  }

  private calculateConnectionEfficiency(response: AxiosResponse): number {
    // Calculate connection efficiency based on various metrics
    const baseScore = 100;
    let efficiency = baseScore;

    if (!this.detectMultiplexing(response)) efficiency -= 20;
    if (!response.headers['link']?.includes('rel=preload')) efficiency -= 10;
    if (response.headers['connection'] === 'close') efficiency -= 15;

    return Math.max(0, efficiency);
  }

  private generateHttp2Suggestions(
    isHttp2: boolean,
    serverPushEnabled: boolean,
    multiplexingUsed: boolean
  ): string[] {
    const suggestions = [];

    if (!isHttp2) {
      suggestions.push('Upgrade to HTTP/2 for improved performance');
    } else {
      if (!serverPushEnabled) {
        suggestions.push('Consider implementing HTTP/2 Server Push for critical resources');
      }
      if (!multiplexingUsed) {
        suggestions.push('Optimize connection usage to better utilize HTTP/2 multiplexing');
      }
    }

    return suggestions;
  }

  analyzePageSize(response: AxiosResponse, resources: ResourceTiming[]): PageSizeAnalysis {
    const resourceSizes = {
      js: 0,
      css: 0,
      images: 0,
      fonts: 0,
      other: 0
    };

    resources.forEach(resource => {
      switch (resource.type) {
        case 'javascript':
          resourceSizes.js += resource.size;
          break;
        case 'stylesheet':
          resourceSizes.css += resource.size;
          break;
        case 'image':
          resourceSizes.images += resource.size;
          break;
        case 'font':
          resourceSizes.fonts += resource.size;
          break;
        default:
          resourceSizes.other += resource.size;
      }
    });

    const htmlSize = response.data.length;
    const totalSize = Object.values(resourceSizes).reduce((a, b) => a + b, htmlSize);

    const { maxTotalSizeKB, maxHtmlSizeKB, resourceLimits } = this.config.pageSize;
    const exceedsLimits = 
      totalSize > maxTotalSizeKB * 1024 ||
      htmlSize > maxHtmlSizeKB * 1024 ||
      resourceSizes.js > resourceLimits.maxJsSizeKB * 1024 ||
      resourceSizes.css > resourceLimits.maxCssSizeKB * 1024 ||
      resourceSizes.images > resourceLimits.maxImageSizeKB * 1024;

    return {
      totalSize,
      htmlSize,
      resourceSizes,
      exceedsLimits,
      suggestions: this.generatePageSizeSuggestions(totalSize, htmlSize, resourceSizes)
    };
  }

  private generatePageSizeSuggestions(
    totalSize: number,
    htmlSize: number,
    resourceSizes: any
  ): string[] {
    const suggestions = [];
    const { maxTotalSizeKB, maxHtmlSizeKB, resourceLimits } = this.config.pageSize;

    if (totalSize > maxTotalSizeKB * 1024) {
      suggestions.push(`Total page size (${Math.round(totalSize/1024)}KB) exceeds recommended limit (${maxTotalSizeKB}KB)`);
    }

    if (htmlSize > maxHtmlSizeKB * 1024) {
      suggestions.push('Consider reducing HTML size through minification');
    }

    if (resourceSizes.js > resourceLimits.maxJsSizeKB * 1024) {
      suggestions.push('JavaScript assets exceed recommended size. Consider code splitting and lazy loading');
    }

    if (resourceSizes.css > resourceLimits.maxCssSizeKB * 1024) {
      suggestions.push('CSS assets exceed recommended size. Consider optimizing and removing unused styles');
    }

    if (resourceSizes.images > resourceLimits.maxImageSizeKB * 1024) {
      suggestions.push('Image assets exceed recommended size. Consider optimization and lazy loading');
    }

    return suggestions;
  }

  async analyzePage(html: string, url: string, headers: Record<string, string>): Promise<{
    mobileFriendlinessAnalysis,
    ampAnalysis,
    resourceUsageAnalysis,
    cookieAnalysis,
    overallScore,
  }> {
    const [
      mobileFriendlinessAnalysis,
      ampAnalysis,
      resourceUsageAnalysis,
      cookieAnalysis
    ] = await Promise.all([
      this.mobileAnalysisService.analyzeMobileFriendliness(html),
      this.ampAnalysisService.analyzeAmp(html, url),
      this.resourceUsageAnalysisService.analyzeResourceUsage(html),
      this.cookieAnalysisService.analyzeCookies(
        headers['set-cookie']?.split(',') || [],
        headers,
        html
      )
    ]);

    return {
      mobileFriendlinessAnalysis,
      ampAnalysis,
      resourceUsageAnalysis,
      cookieAnalysis,
      overallScore: this.calculateOverallScore(
        mobileFriendlinessAnalysis.score,
        ampAnalysis.score,
        resourceUsageAnalysis.score,
        cookieAnalysis.score
      )
    };
  }

  private calculateOverallScore(...scores: number[]): number {
    const weights = {
      mobileFriendliness: 0.4,
      amp: 0.2,
      resourceUsage: 0.2,
      cookies: 0.2
    };

    return Math.round(
      scores[0] * weights.mobileFriendliness +
      scores[1] * weights.amp +
      scores[2] * weights.resourceUsage +
      scores[3] * weights.cookies
    );
  }
}
