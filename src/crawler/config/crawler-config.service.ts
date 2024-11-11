import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InclusionExclusionService, Rule } from './inclusion-exclusion.service';
import { GeneralConfig } from './sub-configs/general.config';
import { SitemapConfig } from './sub-configs/sitemap.config';
import { DirectoryTreeConfig } from './sub-configs/directory-tree.config';
import { MultithreadingConfig } from './sub-configs/multithreading.config';
import { AsyncOperationsConfig } from './sub-configs/async-operations.config';
import { RateLimitConfig } from './sub-configs/rate-limit.config';
import { HttpHeaderConfig } from './sub-configs/http-header.config';

@Injectable()
export class CrawlerConfigService {
  private generalConfig: GeneralConfig;
  private sitemapConfig: SitemapConfig;
  private directoryTreeConfig: DirectoryTreeConfig;
  private multithreadingConfig: MultithreadingConfig;
  private specificUrlList: string[] = [];
  private customStartingPoints: string[] = [];
  private asyncOperationsConfig: AsyncOperationsConfig;
  private rateLimitConfig: RateLimitConfig;
  private httpHeaderConfig: HttpHeaderConfig;

  constructor(
    private configService: ConfigService,
    private inclusionExclusionService: InclusionExclusionService
  ) {
    this.generalConfig = new GeneralConfig(configService);
    this.sitemapConfig = new SitemapConfig(configService);
    this.directoryTreeConfig = new DirectoryTreeConfig(configService);
    this.multithreadingConfig = new MultithreadingConfig(configService);
    this.asyncOperationsConfig = new AsyncOperationsConfig(configService);
    this.rateLimitConfig = new RateLimitConfig(configService);
    this.httpHeaderConfig = new HttpHeaderConfig(configService);
    this.loadRulesFromEnv();
    this.loadSpecificUrlListFromEnv();
    this.loadCustomStartingPointsFromEnv();
  }

  getTechnicalSeoConfig() {
    return {
      performance: {
        ttfbThreshold: this.configService.get<number>('TECH_SEO_TTFB_THRESHOLD', 200),
        domLoadThreshold: this.configService.get<number>('TECH_SEO_DOM_LOAD_THRESHOLD', 2500),
        loadTimeThreshold: this.configService.get<number>('TECH_SEO_LOAD_TIME_THRESHOLD', 3000),
        firstContentfulPaintThreshold: this.configService.get<number>('TECH_SEO_FCP_THRESHOLD', 1800),
        speedIndex: this.configService.get<number>('TECH_SEO_SPEED_INDEX_THRESHOLD', 3400),
        resourceTiming: {
          enabled: this.configService.get<boolean>('TECH_SEO_RESOURCE_TIMING_ENABLED', true),
          slowResourceThreshold: this.configService.get<number>('TECH_SEO_SLOW_RESOURCE_THRESHOLD', 1000),
        }
      },
      pageSize: {
        maxTotalSizeKB: this.configService.get<number>('TECH_SEO_MAX_TOTAL_SIZE_KB', 5120),
        maxHtmlSizeKB: this.configService.get<number>('TECH_SEO_MAX_HTML_SIZE_KB', 100),
        resourceLimits: {
          maxJsSizeKB: this.configService.get<number>('TECH_SEO_MAX_JS_SIZE_KB', 400),
          maxCssSizeKB: this.configService.get<number>('TECH_SEO_MAX_CSS_SIZE_KB', 100),
          maxImageSizeKB: this.configService.get<number>('TECH_SEO_MAX_IMAGE_SIZE_KB', 1000),
          maxFontSizeKB: this.configService.get<number>('TECH_SEO_MAX_FONT_SIZE_KB', 100),
        }
      },
      compression: {
        minCompressionRatio: this.configService.get<number>('TECH_SEO_MIN_COMPRESSION_RATIO', 0.7),
        preferredEncodings: this.configService.get<string>('TECH_SEO_PREFERRED_ENCODINGS', 'br,gzip').split(','),
        checkPrecompressed: this.configService.get<boolean>('TECH_SEO_CHECK_PRECOMPRESSED', true),
        warnUncompressed: this.configService.get<boolean>('TECH_SEO_WARN_UNCOMPRESSED', true),
      },
      http2: {
        required: this.configService.get<boolean>('TECH_SEO_HTTP2_REQUIRED', true),
        analyzeServerPush: this.configService.get<boolean>('TECH_SEO_ANALYZE_SERVER_PUSH', true),
        checkMultiplexing: this.configService.get<boolean>('TECH_SEO_CHECK_MULTIPLEXING', true),
        connectionEfficiency: {
          enabled: this.configService.get<boolean>('TECH_SEO_CONNECTION_EFFICIENCY_ENABLED', true),
          minConcurrentStreams: this.configService.get<number>('TECH_SEO_MIN_CONCURRENT_STREAMS', 30),
        }
      },
      advanced: {
        resourcePrioritization: this.configService.get<boolean>('TECH_SEO_RESOURCE_PRIORITIZATION', true),
        preloadAnalysis: this.configService.get<boolean>('TECH_SEO_PRELOAD_ANALYSIS', true),
        cacheAnalysis: this.configService.get<boolean>('TECH_SEO_CACHE_ANALYSIS', true),
        cdnDetection: this.configService.get<boolean>('TECH_SEO_CDN_DETECTION', true),
        dnsPreFetchAnalysis: this.configService.get<boolean>('TECH_SEO_DNS_PREFETCH_ANALYSIS', true),
      },
      mobileFriendliness: {
        enabled: this.configService.get<boolean>('TECH_SEO_MOBILE_FRIENDLY_ENABLED', true),
        viewportAnalysis: {
          requiredProperties: this.configService.get<string>('MOBILE_VIEWPORT_REQUIRED_PROPS', 'width,initial-scale').split(','),
          minTouchTargetSize: this.configService.get<number>('MOBILE_MIN_TOUCH_TARGET_SIZE', 48),
          minTouchTargetSpacing: this.configService.get<number>('MOBILE_MIN_TOUCH_TARGET_SPACING', 8),
          minFontSize: this.configService.get<number>('MOBILE_MIN_FONT_SIZE', 12),
          maxContentWidth: this.configService.get<number>('MOBILE_MAX_CONTENT_WIDTH', 980),
        },
        mediaQueries: {
          checkResponsiveImages: this.configService.get<boolean>('MOBILE_CHECK_RESPONSIVE_IMAGES', true),
          checkResponsiveBreakpoints: this.configService.get<boolean>('MOBILE_CHECK_RESPONSIVE_BREAKPOINTS', true),
        }
      },
      amp: {
        enabled: this.configService.get<boolean>('TECH_SEO_AMP_ENABLED', true),
        validateAmpHtml: this.configService.get<boolean>('AMP_VALIDATE_HTML', true),
        checkCanonicalRelation: this.configService.get<boolean>('AMP_CHECK_CANONICAL', true),
        maxAmpSize: this.configService.get<number>('AMP_MAX_SIZE_KB', 50),
      },
      resourceUsage: {
        iframe: {
          enabled: this.configService.get<boolean>('TECH_SEO_IFRAME_ANALYSIS_ENABLED', true),
          maxIframes: this.configService.get<number>('MAX_IFRAMES_PER_PAGE', 3),
          checkSandbox: this.configService.get<boolean>('IFRAME_CHECK_SANDBOX', true),
          checkSecurity: this.configService.get<boolean>('IFRAME_CHECK_SECURITY', true),
        },
        flash: {
          enabled: this.configService.get<boolean>('TECH_SEO_FLASH_DETECTION_ENABLED', true),
          checkAlternatives: this.configService.get<boolean>('FLASH_CHECK_ALTERNATIVES', true),
        }
      },
      cookies: {
        enabled: this.configService.get<boolean>('TECH_SEO_COOKIE_ANALYSIS_ENABLED', true),
        maxCookieSize: this.configService.get<number>('MAX_COOKIE_SIZE_KB', 4),
        checkGdprCompliance: this.configService.get<boolean>('COOKIE_CHECK_GDPR', true),
        categories: this.configService.get<string>('COOKIE_CATEGORIES', 'necessary,preferences,statistics,marketing').split(','),
        maxCookiesPerDomain: this.configService.get<number>('MAX_COOKIES_PER_DOMAIN', 50),
      }
    };
  }
  
  getJavaScriptRenderingConfig() {
    return  {
      enabled: this.configService.get<boolean>('JS_RENDERING_ENABLED', true),
      timeout: this.configService.get<number>('JS_RENDERING_TIMEOUT', 30000),
      waitUntil: this.configService.get<string>('JS_RENDERING_WAIT_UNTIL', 'networkidle0'),
      userAgent: this.configService.get<string>('JS_RENDERING_USER_AGENT', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'),
      viewport: {
        width: this.configService.get<number>('JS_RENDERING_VIEWPORT_WIDTH', 1920),
        height: this.configService.get<number>('JS_RENDERING_VIEWPORT_HEIGHT', 1080),
        deviceScaleFactor: this.configService.get<string>('JS_RENDERING_DEVICE_SCALE_FACTOR', '1'),
      },
    };
  }


  getImageAnalysisConfig() {
    return {
      enabled: this.configService.get<boolean>('IMAGE_ANALYSIS_ENABLED', true),
      maxSizeMB: this.configService.get<number>('IMAGE_MAX_SIZE_MB', 5),
      minWidth: this.configService.get<number>('IMAGE_MIN_WIDTH', 100),
      minHeight: this.configService.get<number>('IMAGE_MIN_HEIGHT', 100),
      allowedFormats: this.configService.get<string>('IMAGE_FORMATS_ALLOWED', 'jpg,jpeg,png,gif,webp,svg').split(','),
      ocrEnabled: this.configService.get<boolean>('OCR_ENABLED', true),
      ocrConfidenceThreshold: this.configService.get<number>('OCR_CONFIDENCE_THRESHOLD', 0.7),
    };
  }

  getKeywordAnalysisConfig() {
    return {
      densityAnalysisEnabled: this.configService.get<boolean>('KEYWORD_DENSITY_ANALYSIS_ENABLED', true),
      densityThreshold: this.configService.get<number>('KEYWORD_DENSITY_THRESHOLD', 2),
      usageMinCount: this.configService.get<number>('KEYWORD_USAGE_MIN_COUNT', 3),
      usageMaxCount: this.configService.get<number>('KEYWORD_USAGE_MAX_COUNT', 10),
      contentHtmlRatioThreshold: this.configService.get<number>('CONTENT_HTML_RATIO_THRESHOLD', 0.2),
      duplicateContentSimilarityThreshold: this.configService.get<number>('DUPLICATE_CONTENT_SIMILARITY_THRESHOLD', 0.9),
      nearDuplicateContentSimilarityThreshold: this.configService.get<number>('NEAR_DUPLICATE_CONTENT_SIMILARITY_THRESHOLD', 0.8),
      minWordCount: this.configService.get<number>('CONTENT_ANALYSIS_MIN_WORD_COUNT', 100),
    };
  }

  getThinContentConfig() {
    return {
      wordThreshold: this.configService.get<number>('THIN_CONTENT_WORD_THRESHOLD', 300),
      charThreshold: this.configService.get<number>('THIN_CONTENT_CHAR_THRESHOLD', 1500),
    };
  }

  

  getReadabilityScoreConfig() {
    return {
      enabled: this.configService.get<boolean>('READABILITY_SCORE_ENABLED', true),
    };
  }
  
  getContentAnalysisConfig() {
    return {
      wordCount: {
        minLength: this.configService.get<number>('WORD_COUNT_MIN_LENGTH', 3),
        maxLength: this.configService.get<number>('WORD_COUNT_MAX_LENGTH', 30),
      },
      languageDetection: {
        confidenceThreshold: this.configService.get<number>('LANGUAGE_DETECTION_CONFIDENCE_THRESHOLD', 0.8),
      },
    };
  }

  getOpenGraphConfig() {
    return {
      enabled: this.configService.get<boolean>('OG_ANALYSIS_ENABLED', true),
      requiredProperties: this.configService.get<string>('OG_REQUIRED_PROPERTIES', 'og:title,og:type,og:image,og:url').split(','),
    };
  }
  
  getTwitterCardConfig() {
    return {
      enabled: this.configService.get<boolean>('TWITTER_CARD_ANALYSIS_ENABLED', true),
      requiredProperties: this.configService.get<string>('TWITTER_CARD_REQUIRED_PROPERTIES', 'twitter:card,twitter:title,twitter:description,twitter:image').split(','),
    };
  }
  
  getViewportConfig() {
    return {
      enabled: this.configService.get<boolean>('VIEWPORT_ANALYSIS_ENABLED', true),
      recommendedValue: this.configService.get<string>('VIEWPORT_RECOMMENDED_VALUE', 'width=device-width, initial-scale=1'),
    };
  }

  getHreflangConfig() {
    return {
      enabled: this.configService.get<boolean>('HREFLANG_ANALYSIS_ENABLED', true),
      maxTags: this.configService.get<number>('HREFLANG_MAX_TAGS', 10),
      requiredAttributes: this.configService.get<string>('HREFLANG_REQUIRED_ATTRIBUTES', 'hreflang,href').split(','),
    };
  }

  getRelLinkConfig() {
    return {
      enabled: this.configService.get<boolean>('REL_LINK_ANALYSIS_ENABLED', true),
      maxDepth: this.configService.get<number>('REL_LINK_MAX_DEPTH', 3),
    };
  }

    getCanonicalTagConfig() {
      return {
        enabled: this.configService.get<boolean>('CANONICAL_TAG_ANALYSIS_ENABLED', true),
        maxLength: this.configService.get<number>('CANONICAL_TAG_MAX_LENGTH', 2048),
        allowRelative: this.configService.get<boolean>('CANONICAL_TAG_ALLOW_RELATIVE', true),
      };
    }

    getMetaRobotsConfig() {
      return {
        enabled: this.configService.get<boolean>('META_ROBOTS_ANALYSIS_ENABLED', true),
        directivesToCheck: this.configService.get<string>('META_ROBOTS_DIRECTIVES_TO_CHECK', 'noindex,nofollow,noarchive,nosnippet,noimageindex,notranslate,noodp,noydir')
          .split(',')
          .map(directive => directive.trim()),
        maxLength: this.configService.get<number>('META_ROBOTS_MAX_LENGTH', 200),
      };
    }

    getMetaKeywordsConfig() {
      return {
        enabled: this.configService.get<boolean>('META_KEYWORDS_EXTRACTION_ENABLED', true),
        maxCount: this.configService.get<number>('META_KEYWORDS_MAX_COUNT', 10),
      };
    }

    getKeywordExtractionConfig() {
      return {
        minWordLength: this.configService.get<number>('KEYWORD_EXTRACTION_MIN_WORD_LENGTH', 4),
        maxKeywords: this.configService.get<number>('KEYWORD_EXTRACTION_MAX_KEYWORDS', 50),
        minOccurrence: this.configService.get<number>('KEYWORD_EXTRACTION_MIN_OCCURRENCE', 3),
        maxPagesToAnalyze: this.configService.get<number>('KEYWORD_EXTRACTION_MAX_PAGES_TO_ANALYZE', 10),
      };
    }
  
    getSecurityHeaderConfig() {
      return {
        enabled: this.configService.get<boolean>('SECURITY_HEADER_ANALYSIS_ENABLED', true),
        headersToCheck: this.configService.get<string>('SECURITY_HEADERS_TO_CHECK', '')
          .split(',')
          .map(header => header.trim()),
      };
    }

    getHeadingAnalysisConfig() {
      return {
        enabled: this.configService.get<boolean>('HEADING_ANALYSIS_ENABLED', true),
        maxLength: this.configService.get<number>('HEADING_MAX_LENGTH', 70),
        idealH1Count: this.configService.get<number>('HEADING_IDEAL_H1_COUNT', 1),
        maxH1Count: this.configService.get<number>('HEADING_MAX_H1_COUNT', 1),
        maxH2Count: this.configService.get<number>('HEADING_MAX_H2_COUNT', 10),
        maxH3Count: this.configService.get<number>('HEADING_MAX_H3_COUNT', 20),
        maxH4Count: this.configService.get<number>('HEADING_MAX_H4_COUNT', 30),
        maxH5Count: this.configService.get<number>('HEADING_MAX_H5_COUNT', 40),
        maxH6Count: this.configService.get<number>('HEADING_MAX_H6_COUNT', 50),
      };
    }

    getMetaDescriptionConfig() {
      return {
        minLength: this.configService.get<number>('META_DESCRIPTION_MIN_LENGTH', 120),
        maxLength: this.configService.get<number>('META_DESCRIPTION_MAX_LENGTH', 160),
        keywordMinCount: this.configService.get<number>('META_DESCRIPTION_KEYWORD_MIN_COUNT', 1),
      };
    }

    getHttpHeaderConfig() {
      return this.httpHeaderConfig.getConfig();
    }

    getUrlAnalysisConfig() {
      return {
        maxDepth: this.configService.get<number>('URL_ANALYSIS_MAX_DEPTH', 10),
        cleanUrlThreshold: this.configService.get<number>('URL_ANALYSIS_CLEAN_URL_THRESHOLD', 3),
        paramMaxLength: this.configService.get<number>('URL_PARAM_MAX_LENGTH', 100),
        paramMaxCount: this.configService.get<number>('URL_PARAM_MAX_COUNT', 20),
        maxTotalLength: this.configService.get<number>('URL_MAX_TOTAL_LENGTH', 2083),
        maxPathLength: this.configService.get<number>('URL_MAX_PATH_LENGTH', 1000),
        maxQueryLength: this.configService.get<number>('URL_MAX_QUERY_LENGTH', 1000),
        maxFragmentLength: this.configService.get<number>('URL_MAX_FRAGMENT_LENGTH', 255),
        lowercasePreferred: this.configService.get<boolean>('URL_LOWERCASE_PREFERRED', true),
        preferredProtocol: this.configService.get<string>('URL_PREFERRED_PROTOCOL', 'https'),
      };
    } 

    getContentTypeConfig() {
      return {
        enabled: this.configService.get<boolean>('CONTENT_TYPE_DETECTION_ENABLED', true),
        maxSize: this.configService.get<number>('CONTENT_TYPE_MAX_SIZE', 10485760),
        allowedTypes: this.configService.get<string>('CONTENT_TYPE_ALLOWED_TYPES', 'text/html,application/pdf,image/jpeg,image/png,image/gif').split(','),
      };
    }

    getTitleTagConfig() {
      return {
        minLength: this.configService.get<number>('TITLE_TAG_MIN_LENGTH', 10),
        maxLength: this.configService.get<number>('TITLE_TAG_MAX_LENGTH', 60),
        minPixelWidth: this.configService.get<number>('TITLE_TAG_MIN_PIXEL_WIDTH', 200),
        maxPixelWidth: this.configService.get<number>('TITLE_TAG_MAX_PIXEL_WIDTH', 580),
      };
    }

    getHttpStatusCodeConfig() {
      return {
        informational: {
          min: this.configService.get<number>('HTTP_INFORMATIONAL_MIN', 100),
          max: this.configService.get<number>('HTTP_INFORMATIONAL_MAX', 199),
        },
        success: {
          min: this.configService.get<number>('HTTP_SUCCESS_MIN', 200),
          max: this.configService.get<number>('HTTP_SUCCESS_MAX', 299),
        },
        redirection: {
          min: this.configService.get<number>('HTTP_REDIRECTION_MIN', 300),
          max: this.configService.get<number>('HTTP_REDIRECTION_MAX', 399),
        },
        clientError: {
          min: this.configService.get<number>('HTTP_CLIENT_ERROR_MIN', 400),
          max: this.configService.get<number>('HTTP_CLIENT_ERROR_MAX', 499),
        },
        serverError: {
          min: this.configService.get<number>('HTTP_SERVER_ERROR_MIN', 500),
          max: this.configService.get<number>('HTTP_SERVER_ERROR_MAX', 599),
        },
      };
    }

    
    
    getCrawlerConfig() {
    return {
      ...this.generalConfig.getConfig(),
      ...this.sitemapConfig.getConfig(),
      ...this.directoryTreeConfig.getConfig(),
      ...this.multithreadingConfig.getConfig(),
      ...this.asyncOperationsConfig.getConfig(),
      ...this.rateLimitConfig.getConfig(),
      specificUrlList: this.specificUrlList,
      customStartingPoints: this.customStartingPoints,
      requestTimeout: this.configService.get<number>('CRAWLER_REQUEST_TIMEOUT', 30000),
      followInternalLinks: this.configService.get<boolean>('CRAWLER_FOLLOW_INTERNAL_LINKS', true),
      followExternalLinks: this.configService.get<boolean>('CRAWLER_FOLLOW_EXTERNAL_LINKS', false),
      followSubfolderLinks: this.configService.get<boolean>('CRAWLER_FOLLOW_SUBFOLDER_LINKS', true),
      extractSitemapsFromRobots: this.configService.get<boolean>('CRAWLER_EXTRACT_SITEMAPS_FROM_ROBOTS', true),
      extractSitemapsFromHtml: this.configService.get<boolean>('CRAWLER_EXTRACT_SITEMAPS_FROM_HTML', true),
      userAgent: this.configService.get<string>('CRAWLER_USER_AGENT', 'SeoOptimizer Crawler/1.0'),
      batchUpdateSize: this.configService.get<number>('CRAWLER_BATCH_UPDATE_SIZE', 100),
      adaptiveEstimation: this.configService.get<boolean>('CRAWLER_ADAPTIVE_ESTIMATION', true),
      progressPersistence: this.configService.get<boolean>('CRAWLER_PROGRESS_PERSISTENCE', true),
      separateProgressWorker: this.configService.get<boolean>('CRAWLER_SEPARATE_PROGRESS_WORKER', true)
    };

  
  }

  getRobotsTxtAdherence(): boolean {
    return this.generalConfig.getConfig().respectRobotsTxt;
  }

  validateCrawlLimits(urlLimit: number, depthLimit: number): void {
    if (urlLimit <= 0 || depthLimit <= 0) {
      throw new Error('URL limit and depth limit must be positive integers');
    }
  }

  getInclusionRules(): Rule[] {
    return this.inclusionExclusionService.getInclusionRules();
  }
  
  getExclusionRules(): Rule[] {
    return this.inclusionExclusionService.getExclusionRules();
  }

  addInclusionRule(pattern: string, isRegex: boolean = false) {
    this.inclusionExclusionService.addInclusionRule(pattern, isRegex);
  }

  addExclusionRule(pattern: string, isRegex: boolean = false) {
    this.inclusionExclusionService.addExclusionRule(pattern, isRegex);
  }

  removeInclusionRule(pattern: string) {
    this.inclusionExclusionService.removeInclusionRule(pattern);
  }

  removeExclusionRule(pattern: string) {
    this.inclusionExclusionService.removeExclusionRule(pattern);
  }

  getSpecificUrlList(): string[] {
    return this.specificUrlList;
  }

  setSpecificUrlList(urlList: string[]): void {
    this.specificUrlList = urlList;
  }

  getDirectoryTreeConfig() {
    return this.directoryTreeConfig.getConfig();
  }

  getCustomStartingPoints(): string[] {
    return this.customStartingPoints;
  }

  setCustomStartingPoints(startingPoints: string[]): void {
    this.customStartingPoints = startingPoints;
  }

  getMultithreadingConfig() {
    return this.multithreadingConfig.getConfig();
  }

  getAsyncOperationsConfig() {
    return this.asyncOperationsConfig.getConfig();
  }

  private loadRulesFromEnv() {
    const inclusionRules = this.configService.get<string>('CRAWLER_INCLUSION_RULES', '').split(',');
    const exclusionRules = this.configService.get<string>('CRAWLER_EXCLUSION_RULES', '').split(',');

    inclusionRules.forEach(rule => {
      if (rule) this.addInclusionRule(rule.trim());
    });

    exclusionRules.forEach(rule => {
      if (rule) this.addExclusionRule(rule.trim());
    });
  }

  private loadSpecificUrlListFromEnv() {
    const urlList = this.configService.get<string>('CRAWLER_SPECIFIC_URL_LIST', '').split(',');
    this.specificUrlList = urlList.filter(url => url.trim() !== '');
  }

  private loadCustomStartingPointsFromEnv() {
    const startingPoints = this.configService.get<string>('CRAWLER_CUSTOM_STARTING_POINTS', '').split(',');
    this.customStartingPoints = startingPoints.filter(point => point.trim() !== '');
  }

  getRateLimitConfig() {
    return this.rateLimitConfig.getConfig();
  }
}
