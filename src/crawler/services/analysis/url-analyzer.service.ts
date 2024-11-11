

import { Injectable, Logger } from '@nestjs/common';
import { URL } from 'url';
import { CrawlerConfigService } from '../../config/crawler-config.service';

@Injectable()
export class UrlAnalyzerService {
  private readonly logger = new Logger(UrlAnalyzerService.name);

  constructor(private readonly crawlerConfigService: CrawlerConfigService) {}

  analyzeUrl(url: string): UrlAnalysis {
    try {
      const parsedUrl = new URL(url);
      const urlConfig = this.crawlerConfigService.getUrlAnalysisConfig();

      return {
        isValid: true,
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        pathname: parsedUrl.pathname,
        search: parsedUrl.search,
        hash: parsedUrl.hash,
        isClean: this.isCleanUrl(parsedUrl),
        depth: this.calculateUrlDepth(parsedUrl.pathname),
        pattern: this.identifyUrlPattern(parsedUrl),
        isWithinDepthLimit: this.isWithinDepthLimit(parsedUrl.pathname, urlConfig.maxDepth),
        isLowercase: this.isLowercase(url),
        hasPreferredProtocol: this.hasPreferredProtocol(parsedUrl.protocol, urlConfig.preferredProtocol),
        queryStringAnalysis: this.analyzeQueryString(parsedUrl.searchParams, urlConfig.paramMaxCount),
        fragmentAnalysis: this.analyzeFragment(parsedUrl.hash, urlConfig.maxFragmentLength),
      };
    } catch (error) {
      this.logger.warn(`Invalid URL: ${url}`);
      return { isValid: false };
    }
  }

  private isCleanUrl(parsedUrl: URL): boolean {
    const urlConfig = this.crawlerConfigService.getUrlAnalysisConfig();
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
    return !parsedUrl.search && !parsedUrl.hash && pathSegments.length <= urlConfig.cleanUrlThreshold;
  }

  private calculateUrlDepth(pathname: string): number {
    return pathname.split('/').filter(Boolean).length;
  }

  private identifyUrlPattern(parsedUrl: URL): string {
    if (parsedUrl.pathname.includes('/category/')) return 'category';
    if (parsedUrl.pathname.includes('/product/')) return 'product';
    if (parsedUrl.pathname.includes('/blog/')) return 'blog';
    if (parsedUrl.pathname.match(/\/\d{4}\/\d{2}\/\d{2}\//)) return 'date-based';
    return 'other';
  }

  private isWithinDepthLimit(pathname: string, maxDepth: number): boolean {
    return this.calculateUrlDepth(pathname) <= maxDepth;
  }

  analyzeUrlParameters(url: string): UrlParameterAnalysis {
    const parsedUrl = new URL(url);
    const params = new URLSearchParams(parsedUrl.search);
    const config = this.crawlerConfigService.getUrlAnalysisConfig();

    const parameterCount = params.size;
    const parameterDetails = this.getParameterDetails(params);
    const exceedsMaxCount = parameterCount > config.paramMaxCount;
    const exceedsMaxLength = this.checkParameterLength(parameterDetails, config.paramMaxLength);
    const sensitiveDataDetected = this.detectSensitiveData(parameterDetails);

    return {
      parameterCount,
      parameterDetails,
      exceedsMaxCount,
      exceedsMaxLength,
      sensitiveDataDetected,
    };
  }

  private getParameterDetails(params: URLSearchParams): ParameterDetail[] {
    return Array.from(params.entries()).map(([name, value]) => ({
      name,
      value,
      length: name.length + value.length,
      containsSensitiveData: this.isSensitiveData(name, value),
    }));
  }

  private isSensitiveData(name: string, value: string): boolean {
    const sensitivePatterns = [
      /password/i,
      /token/i,
      /api[-_]?key/i,
      /secret/i,
      /^ssn$/i,
      /credit[-_]?card/i,
      /^cc[-_]?num(ber)?$/i,
    ];

    return sensitivePatterns.some(pattern => 
      pattern.test(name) || 
      (value.length > 8 && /^[A-Za-z0-9+/=]+$/.test(value)) // Potential encoded data
    );
  }

  private detectSensitiveData(details: ParameterDetail[]): boolean {
    return details.some(detail => detail.containsSensitiveData);
  }

  private checkParameterLength(details: ParameterDetail[], maxLength: number): boolean {
    return details.some(detail => detail.length > maxLength);
  }

  analyzeUrlLength(url: string): UrlLengthAnalysis {
    const parsedUrl = new URL(url);
    const config = this.crawlerConfigService.getUrlAnalysisConfig();

    const totalLength = url.length;
    const pathLength = parsedUrl.pathname.length;
    const queryLength = parsedUrl.search.length;
    const fragmentLength = parsedUrl.hash.length;

    return {
      totalLength,
      pathLength,
      queryLength,
      fragmentLength,
      exceedsTotalLength: totalLength > config.maxTotalLength,
      exceedsPathLength: pathLength > config.maxPathLength,
      exceedsQueryLength: queryLength > config.maxQueryLength,
      exceedsFragmentLength: fragmentLength > config.maxFragmentLength,
    };
  }

  private isLowercase(url: string): boolean {
    return url === url.toLowerCase();
  }

  private hasPreferredProtocol(protocol: string, preferredProtocol: string): boolean {
    return protocol.replace(':', '') === preferredProtocol;
  }

  private analyzeQueryString(searchParams: URLSearchParams, maxQueryParams: number): QueryStringAnalysis {
    const params = Array.from(searchParams.entries());
    return {
      paramCount: params.length,
      exceedsMaxParams: params.length > maxQueryParams,
      params: params.map(([key, value]) => ({ key, value })),
    };
  }

  private analyzeFragment(fragment: string, maxFragmentLength: number): FragmentAnalysis {
    return {
      hasFragment: fragment.length > 0,
      fragmentLength: fragment.length,
      exceedsMaxLength: fragment.length > maxFragmentLength,
    };
  }
}

interface UrlAnalysis {
  isValid: boolean;
  protocol?: string;
  hostname?: string;
  pathname?: string;
  search?: string;
  hash?: string;
  isClean?: boolean;
  depth?: number;
  pattern?: string;
  isWithinDepthLimit?: boolean;
  isLowercase?: boolean;
  hasPreferredProtocol?: boolean;
  queryStringAnalysis?: QueryStringAnalysis;
  fragmentAnalysis?: FragmentAnalysis;
}

interface UrlParameterAnalysis {
  parameterCount: number;
  parameterDetails: ParameterDetail[];
  exceedsMaxCount: boolean;
  exceedsMaxLength: boolean;
  sensitiveDataDetected: boolean;
}

interface ParameterDetail {
  name: string;
  value: string;
  length: number;
  containsSensitiveData: boolean;
}

interface UrlLengthAnalysis {
  totalLength: number;
  pathLength: number;
  queryLength: number;
  fragmentLength: number;
  exceedsTotalLength: boolean;
  exceedsPathLength: boolean;
  exceedsQueryLength: boolean;
  exceedsFragmentLength: boolean;
}

interface QueryStringAnalysis {
  paramCount: number;
  exceedsMaxParams: boolean;
  params: { key: string; value: string }[];
}

interface FragmentAnalysis {
  hasFragment: boolean;
  fragmentLength: number;
  exceedsMaxLength: boolean;
}