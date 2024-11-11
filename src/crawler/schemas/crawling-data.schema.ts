import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})
export class CrawlingData extends Document {
  @Prop({ index: true })
  crawlingId: string;

  @Prop()
  pageTitle: string;

  @Prop({ index: true })
  pageUrlRelative: string;

  @Prop({ type: Object })
  pageMetaData: Record<string, string>;

  @Prop({ type: Array })
  imageData: any[];

  @Prop()
  mainContent: string;

  @Prop()
  wordCount: number;

  @Prop()
  loadTime: number;

  @Prop({ type: Object })
  urlStructure: Record<string, string>;

  @Prop({ type: Object })
  brandingElements: Record<string, boolean>;

  @Prop({ type: [String] })
  structuredData: string[];

  @Prop({ type: Object })
  seoScores: Record<string, number>;

  @Prop({ type: Object })
  directoryTree: {
    name: string;
    type: string;
    children: any[];
  };

  @Prop()
  directoryTreeDepth: number;

  @Prop()
  directoryTreeFileCount: number;

  @Prop()
  directoryTreeFolderCount: number;

  @Prop({ type: [String] })
  directoryTreeFileTypes: string[];

  @Prop({ type: Object })
  urlAnalysis: {
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
    queryStringAnalysis?: {
      paramCount: number;
      exceedsMaxParams: boolean;
      params: { key: string; value: string }[];
    };
    fragmentAnalysis?: {
      hasFragment: boolean;
      fragmentLength: number;
      exceedsMaxLength: boolean;
    };
  };

  @Prop({ type: Object })
  urlParameterAnalysis: {
    parameterCount: number;
    parameterDetails: {
      name: string;
      value: string;
      length: number;
    }[];
    exceedsMaxCount: boolean;
    exceedsMaxLength: boolean;
  };

  @Prop({ type: Object })
  urlLengthAnalysis: {
    totalLength: number;
    pathLength: number;
    queryLength: number;
    fragmentLength: number;
    exceedsTotalLength: boolean;
    exceedsPathLength: boolean;
    exceedsQueryLength: boolean;
    exceedsFragmentLength: boolean;
  };

  @Prop({ type: Object })
  httpStatusCodeAnalysis: {
    statusCode: number;
    category: string;
    seoImpact: string;
  };

  @Prop({ type: Object })
  contentTypeAnalysis: {
    contentType: string;
    category: string;
    isAllowed: boolean;
    exceedsMaxSize: boolean;
  };

  @Prop({ type: Object })
  xRobotsTagAnalysis?: {
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
  };

  @Prop({ type: Object })
  securityHeaderAnalysis?: {
    analyzed: boolean;
    headers?: {
      [key: string]: {
        present: boolean;
        value: string;
      };
    };
  };

  @Prop({ type: Object })
  titleTagAnalysis?: {
    content: string;
    length: number;
    pixelWidth: number;
    isTooShort: boolean;
    isTooLong: boolean;
    isPixelWidthTooNarrow: boolean;
    isPixelWidthTooWide: boolean;
  };

  @Prop({ type: Object })
  metaDescriptionAnalysis?: {
    content: string;
    length: number;
    isTooShort: boolean;
    isTooLong: boolean;
    keywordCount: number;
    hasEnoughKeywords: boolean;
  };

  @Prop({ type: Object })
  headingAnalysis: {
    headingCounts: {
      counts: Record<string, number>;
      hasIdealH1Count: boolean;
      exceedsMaxCounts: Record<string, boolean>;
    };
    headingOrder: {
      isCorrectOrder: boolean;
      headingSequence: string[];
    };
    headingContent: {
      [key: string]: { content: string; length: number; exceedsMaxLength: boolean }[];
    };
  };

  @Prop({ type: Object })
  metaKeywordsAnalysis?: {
    content: string;
    keywordCount: number;
    keywords: string[];
    exceedsMaxCount: boolean;
  };

  @Prop({ type: Object })
  metaRobotsTagAnalysis?: {
    content: string;
    length: number;
    isTooLong: boolean;
    directives: Record<string, boolean>;
    stats: {
      noindexCount: number;
      nofollowCount: number;
      otherDirectivesCount: number;
    };
  };

  @Prop({ type: Object })
  canonicalTagAnalysis?: {
    href: string | null;
    isValid: boolean;
    issues: string[];
  };

  @Prop({ type: Object })
  relLinkAnalysis?: {
    nextLink: string | null;
    prevLink: string | null;
    isPartOfSeries: boolean;
  };

  @Prop({ type: Object })
  hreflangAnalysis?: {
    tags: { hreflang: string; href: string }[];
    count: number;
    hasXDefault: boolean;
    exceedsMaxTags: boolean;
    missingRequiredAttributes: boolean;
  };

  @Prop({ type: Object })
openGraphAnalysis?: {
  properties: { property: string; content: string }[];
  missingRequiredProperties: string[];
  isValid: boolean;
  contentQualityAnalysis: {
    titleQuality: { length: number; isOptimal: boolean };
    descriptionQuality: { length: number; isOptimal: boolean };
    imageQuality: { url: string; dimensions: { width: number; height: number } | null; isOptimal: boolean };
  };
  recommendations: string[];
};

@Prop({ type: Object })
twitterCardAnalysis?: {
  properties: { name: string; content: string }[];
  missingRequiredProperties: string[];
  isValid: boolean;
  contentQualityAnalysis: {
    cardType: string;
    titleQuality: { length: number; isOptimal: boolean };
    descriptionQuality: { length: number; isOptimal: boolean };
    imageQuality: { url: string; dimensions: { width: number; height: number } | null; isOptimal: boolean };
  };
  recommendations: string[];
};

@Prop({ type: Object })
viewportAnalysis?: {
  content: string | undefined;
  isPresent: boolean;
  isRecommendedValue: boolean;
  properties: { [key: string]: string };
  responsiveAnalysis: {
    isResponsive: boolean;
    hasInitialScale: boolean;
    initialScaleValue: number | null;
  };
  recommendations: string[];
};

@Prop({ type: Object })
keywordDensity: Record<string, number>;

@Prop({ type: Object })
keywordUsage: Record<string, number>;

@Prop()
detectedLanguage: string;

@Prop()
contentToHtmlRatio: number;

@Prop()
contentHash: string;

@Prop()
characterCount: number;

@Prop()
sentenceCount: number;

@Prop()
paragraphCount: number;

@Prop()
readabilityScore: number;

@Prop({ type: Object })
topKeywords: Record<string, number>;

@Prop({ type: Object })
thinContentAnalysis: {
  isThinContent: boolean;
  wordCount: number;
  charCount: number;
  contentDensity: number;
  contentToHtmlRatio: number;
  mainContentWordCount: number;
  fullPageWordCount: number;
  specificElementsAnalysis: {
    hasMain: boolean;
    hasArticle: boolean;
    hasContentWrapper: boolean;
  };
};

@Prop({ type: Object })
readabilityAnalysis: {
  fleschKincaidGrade: number;
  automatedReadabilityIndex: number;
  colemanLiauIndex: number;
  averageGradeLevel: number;
  sentenceCount: number;
  wordCount: number;
  syllableCount: number;
  averageWordLength: number;
  averageSyllablesPerWord: number;
  averageWordsPerSentence: number;
};

@Prop({ type: [Object] })
imageAnalysis: {
  url: string;
  altText: {
    present: boolean;
    content: string;
    length: number;
    keywordsPresent: string[];
  };
  titleAttribute: {
    present: boolean;
    content: string;
  };
  fileSize?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  fileFormat?: string;
  isBroken: boolean;
  textInImage?: {
    hasText: boolean;
    text: string;
    confidence: number;
  };
  seoAnalysis?: {
    altTextQuality: string;
    fileSizeOptimized: boolean;
    dimensionsOptimal: boolean;
    formatOptimal: boolean;
    textInImageIssue: boolean;
  };
}[];

@Prop()
totalImages: number;

@Prop()
brokenImages: number;

@Prop()
imagesWithoutAlt: number;

@Prop()
imagesWithoutTitle: number;

@Prop()
oversizedImages: number;

@Prop()
imagesWithTextContent: number;

@Prop({ type: Object })
imageFormatDistribution: Record<string, number>;

@Prop({ type: [String] })
uniqueImageUrls: string[];

@Prop({ type: Object })
jsRenderingAnalysis: {
  contentDifference: {
    textLengthDifference: number;
    wordCountDifference: number;
    newHeadings: { [key: string]: string[] };
    newParagraphs: number;
    newImages: { src: string; alt: string }[];
    newLinks: { href: string; text: string }[];
  };
  dynamicElements: {
    lazyLoadedImages: {
      count: number;
      urls: string[];
    };
    infiniteScroll: boolean;
    dynamicTabs: boolean;
    ajaxForms: boolean;
  };
  seoImpact: {
    titleChange: {
      changed: boolean;
      original: string;
      rendered: string;
    };
    metaDescriptionChange: {
      changed: boolean;
      original: string;
      rendered: string;
    };
    canonicalUrlChange: {
      changed: boolean;
      original: string;
      rendered: string;
    };
    structuredDataChange: {
      changed: boolean;
      original: any[];
      rendered: any[];
    };
    hreflangChange: {
      changed: boolean;
      original: { hreflang: string; href: string }[];
      rendered: { hreflang: string; href: string }[];
    };
  };
};

@Prop()
renderedContent: string;

@Prop({ type: Object })
ajaxContent: {
  [key: string]: string;
};

@Prop({ type: [Object] })
spaRoutes: {
  path: string;
  content: string;
}[];

@Prop({ type: Object })
technicalSeoAnalysis: {
  performance: {
    ttfb: number;
    domLoadTime: number;
    fullLoadTime: number;
    firstContentfulPaint: number;
    speedIndex: number;
    performanceScore: number;
    resourceLoadTimes: {
      url: string;
      type: string;
      duration: number;
      size: number;
      protocol: string;
    }[];
    issues: string[];
  };
  compression: {
    type: string;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    isOptimal: boolean;
    suggestions: string[];
    compressionScore: number;
  };
  http2: {
    enabled: boolean;
    serverPushEnabled: boolean;
    multiplexingUsed: boolean;
    concurrentStreams: number;
    connectionEfficiency: number;
    http2Score: number;
    suggestions: string[];
  };
  pageSize: {
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
    pageSizeScore: number;
    suggestions: string[];
  };
  resourceOptimization: {
    totalResources: number;
    resourcesByType: {
      js: number;
      css: number;
      images: number;
      fonts: number;
      other: number;
    };
    blockingResources: {
      js: string[];
      css: string[];
    };
    deferredResources: {
      js: string[];
      css: string[];
    };
    optimizationScore: number;
    suggestions: string[];
  };
  caching: {
    resourcesCached: number;
    totalResources: number;
    cachingScore: number;
    cacheHeaders: {
      resource: string;
      cacheControl: string;
      expires: string;
      etag: boolean;
    }[];
    suggestions: string[];
  };
  cdnUsage: {
    enabled: boolean;
    provider: string;
    resourcesServed: number;
    cdnScore: number;
    suggestions: string[];
  };
  overallTechnicalScore: number;
  mobileFriendliness: {
    viewport: {
      hasViewport: boolean;
      isResponsive: boolean;
      viewportContent: string;
      issues: string[];
    };
    touchElements: {
      elementsWithSmallTargets: {
        selector: string;
        size: number;
        spacing: number;
      }[];
      totalIssues: number;
    };
    fontSize: {
      tooSmallElements: {
        selector: string;
        size: number;
      }[];
      totalIssues: number;
    };
    contentWidth: {
      exceedsViewport: boolean;
      horizontalScrolling: boolean;
      contentWidth: number;
      viewportWidth: number;
    };
    mediaQueries: {
      hasResponsiveImages: boolean;
      responsiveBreakpoints: number[];
      missingBreakpoints: string[];
    };
    score: number;
    recommendations: string[];
  };
  ampAnalysis: {
    isAmpPage: boolean;
    ampVersion: string;
    ampComponents: {
      name: string;
      valid: boolean;
      errors?: string[];
    }[];
    canonicalRelation: {
      hasCanonical: boolean;
      canonicalUrl: string;
      isValid: boolean;
    };
    ampSize: {
      size: number;
      exceedsLimit: boolean;
    };
    score: number;
    recommendations: string[];
  };
  resourceUsageAnalysis: {
    iframes: {
      count: number;
      elements: {
        src: string;
        hasSandbox: boolean;
        securityAttributes: {
          sandbox?: string;
          allowScripts?: boolean;
          allowSameOrigin?: boolean;
        };
        loading: string;
      }[];
      exceedsLimit: boolean;
      securityIssues: string[];
    };
    flash: {
      detected: boolean;
      elements: {
        type: string;
        src: string;
        hasAlternative: boolean;
      }[];
      alternatives: string[];
    };
    score: number;
    recommendations: string[];
  };
  cookieAnalysis: {
    cookies: {
      name: string;
      domain: string;
      value: string;
      size: number;
      httpOnly: boolean;
      secure: boolean;
      sameSite: string;
      category?: string;
    }[];
    statistics: {
      totalCount: number;
      totalSize: number;
      categoryCounts: Record<string, number>;
      exceedsLimit: boolean;
    };
    gdprCompliance: {
      hasConsentManager: boolean;
      necessaryOnly: boolean;
      issues: string[];
    };
    score: number;
    recommendations: string[];
  };

};

}



export const CrawlingDataSchema = SchemaFactory.createForClass(CrawlingData);

CrawlingDataSchema.index({ crawlingId: 1, pageUrlRelative: 1 }, { unique: true });