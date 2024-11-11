import { Injectable } from '@nestjs/common';
import { CrawlerConfigService } from '../../config/crawler-config.service';

@Injectable()
export class HttpHeaderService {
  constructor(private readonly crawlerConfigService: CrawlerConfigService) {}

  analyzeHttpStatusCode(statusCode: number): HttpStatusCodeAnalysis {
    const category = this.categorizeStatusCode(statusCode);
    const seoImpact = this.assessSeoImpact(statusCode, category);

    return {
      statusCode,
      category,
      seoImpact,
    };
  }

  private categorizeStatusCode(statusCode: number): HttpStatusCategory {
    const config = this.crawlerConfigService.getHttpStatusCodeConfig();

    if (statusCode >= config.informational.min && statusCode <= config.informational.max) {
      return 'Informational';
    } else if (statusCode >= config.success.min && statusCode <= config.success.max) {
      return 'Success';
    } else if (statusCode >= config.redirection.min && statusCode <= config.redirection.max) {
      return 'Redirection';
    } else if (statusCode >= config.clientError.min && statusCode <= config.clientError.max) {
      return 'ClientError';
    } else if (statusCode >= config.serverError.min && statusCode <= config.serverError.max) {
      return 'ServerError';
    }
    return 'Unknown';
  }

  private assessSeoImpact(statusCode: number, category: HttpStatusCategory): SeoImpact {
    switch (category) {
      case 'Success':
        return 'Positive';
      case 'Redirection':
        return statusCode === 301 ? 'Neutral' : 'Negative';
      case 'ClientError':
      case 'ServerError':
        return 'Negative';
      default:
        return 'Neutral';
    }
  }

  extractContentType(headers: Record<string, string>): string {
    return headers['content-type'] || 'application/octet-stream';
  }

  categorizeContentType(contentType: string): string {
    const config = this.crawlerConfigService.getContentTypeConfig();
    if (!config.enabled) {
      return 'unknown';
    }

    const [mimeType] = contentType.split(';');
    const lowerMimeType = mimeType.toLowerCase().trim();

    if (lowerMimeType.startsWith('text/html')) return 'HTML';
    if (lowerMimeType === 'application/pdf') return 'PDF';
    if (lowerMimeType.startsWith('image/')) return 'Image';
    if (lowerMimeType.startsWith('text/')) return 'Text';
    if (lowerMimeType.includes('javascript')) return 'JavaScript';
    if (lowerMimeType.includes('css')) return 'CSS';
    if (lowerMimeType.includes('xml')) return 'XML';
    if (lowerMimeType.includes('json')) return 'JSON';

    return 'Other';
  }

  analyzeContentType(headers: Record<string, string>): ContentTypeAnalysis {
    const contentType = this.extractContentType(headers);
    const category = this.categorizeContentType(contentType);
    const config = this.crawlerConfigService.getContentTypeConfig();

    return {
      contentType,
      category,
      isAllowed: config.allowedTypes.includes(contentType),
      exceedsMaxSize: parseInt(headers['content-length'] || '0', 10) > config.maxSize,
    };
  }

  private parseXRobotsTagDirectives(xRobotsTag: string): XRobotsTagDirectives {
    const directives: XRobotsTagDirectives = {
      noindex: false,
      nofollow: false,
      none: false,
      noarchive: false,
      nosnippet: false,
      notranslate: false,
      noimageindex: false,
      unavailable_after: null,
    };

    const parts = xRobotsTag.toLowerCase().split(',').map(part => part.trim());
    
    for (const part of parts) {
      if (part === 'none') {
        directives.none = true;
        directives.noindex = true;
        directives.nofollow = true;
      } else if (part in directives) {
        directives[part] = true;
      } else if (part.startsWith('unavailable_after:')) {
        directives.unavailable_after = part.split(':')[1].trim();
      }
    }

    return directives;
  }

  analyzeXRobotsTag(headers: Record<string, string>): XRobotsTagAnalysis {
    const config = this.crawlerConfigService.getHttpHeaderConfig();
    if (!config.xRobotsTagEnabled) {
      return { present: false };
    }

    const xRobotsTag = headers['x-robots-tag'];
    if (!xRobotsTag) {
      return { present: false };
    }

    const directives = this.parseXRobotsTagDirectives(xRobotsTag);
    return {
      present: true,
      value: xRobotsTag,
      directives,
      exceedsMaxLength: xRobotsTag.length > config.xRobotsTagMaxLength,
    };
  }

  analyzeSecurityHeaders(headers: Record<string, string>): SecurityHeaderAnalysis {
    const config = this.crawlerConfigService.getSecurityHeaderConfig();
    if (!config.enabled) {
      return { analyzed: false };
    }

    const analysis: SecurityHeaderAnalysis = {
      analyzed: true,
      headers: {},
    };

    for (const header of config.headersToCheck) {
      const value = headers[header.toLowerCase()];
      analysis.headers[header] = {
        present: !!value,
        value: value || '',
      };
    }

    return analysis;
  }
 
}

type HttpStatusCategory = 'Informational' | 'Success' | 'Redirection' | 'ClientError' | 'ServerError' | 'Unknown';
type SeoImpact = 'Positive' | 'Neutral' | 'Negative';

interface HttpStatusCodeAnalysis {
  statusCode: number;
  category: HttpStatusCategory;
  seoImpact: SeoImpact;
}

interface SecurityHeaderAnalysis {
    analyzed: boolean;
    headers?: {
      [key: string]: {
        present: boolean;
        value: string;
      };
    };
  }

interface ContentTypeAnalysis {
    contentType: string;
    category: string;
    isAllowed: boolean;
    exceedsMaxSize: boolean;
}

interface XRobotsTagDirectives {
    noindex: boolean;
    nofollow: boolean;
    none: boolean;
    noarchive: boolean;
    nosnippet: boolean;
    notranslate: boolean;
    noimageindex: boolean;
    unavailable_after: string | null;
}

interface XRobotsTagAnalysis {
    present: boolean;
    value?: string;
    directives?: XRobotsTagDirectives;
    exceedsMaxLength?: boolean;
}
