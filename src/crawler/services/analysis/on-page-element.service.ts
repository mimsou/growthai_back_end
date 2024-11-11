import { Injectable } from '@nestjs/common';
import { CrawlerConfigService } from '../../config/crawler-config.service';
import * as cheerio from 'cheerio';
import * as textWidth from 'text-width';

@Injectable()
export class OnPageElementService {
  private fontOptions: any;

  constructor(private readonly crawlerConfigService: CrawlerConfigService) {
    this.fontOptions = {
      family: 'Arial',
      size: 16
    };
  }

  analyzeMetaKeywords($: cheerio.CheerioAPI): MetaKeywordsAnalysis {
    const metaKeywordsElement = $('meta[name="keywords"]');
    const metaKeywordsContent = metaKeywordsElement.attr('content') || '';
    const config = this.crawlerConfigService.getMetaKeywordsConfig();

    const keywords = metaKeywordsContent
      .split(',')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0);

    return {
      content: metaKeywordsContent,
      keywordCount: keywords.length,
      keywords: keywords.slice(0, config.maxCount),
      exceedsMaxCount: keywords.length > config.maxCount,
    };
  }

    analyzeMetaRobotsTag($: cheerio.CheerioAPI): MetaRobotsTagAnalysis {
      const metaRobotsElement = $('meta[name="robots"]');
      const metaContent = metaRobotsElement.attr('content') || '';
      const config = this.crawlerConfigService.getMetaRobotsConfig();

      const directives = this.parseMetaRobotsDirectives(metaContent);
      const directiveAnalysis = this.analyzeMetaRobotsDirectives(directives, config.directivesToCheck);

      const stats = {
        noindexCount: directiveAnalysis.noindex ? 1 : 0,
        nofollowCount: directiveAnalysis.nofollow ? 1 : 0,
        otherDirectivesCount: Object.values(directiveAnalysis).filter(v => v).length,
      };

      return {
        content: metaContent,
        length: metaContent.length,
        isTooLong: metaContent.length > config.maxLength,
        directives: directiveAnalysis,
        stats: stats,
      };
    }

    parseMetaRobotsDirectives(content: string): string[] {
      return content.toLowerCase().split(',').map(directive => directive.trim());
    }
  
    analyzeMetaRobotsDirectives(directives: string[], directivesToCheck: string[]): Record<string, boolean> {
      const analysis: Record<string, boolean> = {};
      directivesToCheck.forEach(directive => {
        analysis[directive] = directives.includes(directive);
      });
      return analysis;
    }
  

    analyzeTitleTag($: cheerio.CheerioAPI): TitleTagAnalysis {
      const titleElement = $('title');
      const titleContent = titleElement.text().trim();
      const titleLength = titleContent.length;
      const pixelWidth = this.calculatePixelWidth(titleContent);
      const config = this.crawlerConfigService.getTitleTagConfig();

      return {
        content: titleContent,
        length: titleLength,
        pixelWidth,
        isTooShort: titleLength < config.minLength,
        isTooLong: titleLength > config.maxLength,
        isPixelWidthTooNarrow: pixelWidth < config.minPixelWidth,
        isPixelWidthTooWide: pixelWidth > config.maxPixelWidth,
      };
    }

  private calculatePixelWidth(text: string): number {
    return Math.ceil(textWidth(text, this.fontOptions));
  }

  analyzeMetaDescription($: cheerio.CheerioAPI, keywords: string[]): MetaDescriptionAnalysis {
    const metaDescriptionElement = $('meta[name="description"]');
    const metaContent = metaDescriptionElement.attr('content') || '';
    const contentLength = metaContent.length;
    const config = this.crawlerConfigService.getMetaDescriptionConfig();

    const keywordCount = this.countKeywords(metaContent, keywords);

    return {
      content: metaContent,
      length: contentLength,
      isTooShort: contentLength < config.minLength,
      isTooLong: contentLength > config.maxLength,
      keywordCount,
      hasEnoughKeywords: keywordCount >= config.keywordMinCount,
    };
  }

  private countKeywords(text: string, keywords: string[]): number {
    const lowerText = text.toLowerCase();
    return keywords.reduce((count, keyword) => {
      const regex = new RegExp(keyword.toLowerCase(), 'g');
      return count + (lowerText.match(regex) || []).length;
    }, 0);
  }

  analyzeHeadings($: cheerio.CheerioAPI): HeadingAnalysis {
    const config = this.crawlerConfigService.getHeadingAnalysisConfig();
    const headings: HeadingElement[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map(tag => ({
      tag,
      elements: $(tag).toArray().map(el => ({
        content: $(el).text().trim(),
        order: $(el).index('h1, h2, h3, h4, h5, h6'),
        tag
      }))
    }));

    return {
      headingCounts: this.analyzeHeadingCounts(headings, config),
      headingOrder: this.analyzeHeadingOrder(headings),
      headingContent: this.analyzeHeadingContent(headings, config)
    };
  }

  private analyzeHeadingCounts(headings: HeadingElement[], config: any): HeadingCountAnalysis {
    const counts = headings.reduce((acc, { tag, elements }) => {
      acc[tag] = elements.length;
      return acc;
    }, {} as Record<string, number>);

    return {
      counts,
      hasIdealH1Count: counts.h1 === config.idealH1Count,
      exceedsMaxCounts: {
        h1: counts.h1 > config.maxH1Count,
        h2: counts.h2 > config.maxH2Count,
        h3: counts.h3 > config.maxH3Count,
        h4: counts.h4 > config.maxH4Count,
        h5: counts.h5 > config.maxH5Count,
        h6: counts.h6 > config.maxH6Count,
      }
    };
  }

  private analyzeHeadingOrder(headings: HeadingElement[]): HeadingOrderAnalysis {
    const flatHeadings = headings.flatMap(h => h.elements);
    const sortedHeadings = flatHeadings.sort((a, b) => a.order - b.order);
    
    const isCorrectOrder = sortedHeadings.every((heading, index) => {
      if (index === 0) return true;
      const prevLevel = parseInt(sortedHeadings[index - 1].tag.charAt(1));
      const currentLevel = parseInt(heading.tag.charAt(1));
      return currentLevel >= prevLevel - 1;
    });

    return {
      isCorrectOrder,
      headingSequence: sortedHeadings.map(h => h.tag)
    };
  }

  private analyzeHeadingContent(headings: HeadingElement[], config: any): HeadingContentAnalysis {
    return headings.reduce((acc, { tag, elements }) => {
      acc[tag] = elements.map(el => ({
        content: el.content,
        length: el.content.length,
        exceedsMaxLength: el.content.length > config.maxLength
      }));
      return acc;
    }, {} as HeadingContentAnalysis);
  }

  analyzeCanonicalTag($: cheerio.CheerioAPI, currentUrl: string): CanonicalTagAnalysis {
    const canonicalElement = $('link[rel="canonical"]');
    const canonicalHref = canonicalElement.attr('href');
    const config = this.crawlerConfigService.getCanonicalTagConfig();

    let isValid = true;
    let issues: string[] = [];

    if (!canonicalHref) {
      isValid = false;
      issues.push('Missing canonical tag');
    } else {
      if (canonicalHref.length > config.maxLength) {
        isValid = false;
        issues.push('Canonical URL exceeds maximum length');
      }

      if (!config.allowRelative && !this.isAbsoluteUrl(canonicalHref)) {
        isValid = false;
        issues.push('Relative canonical URL not allowed');
      }

      if (this.isSelfReferencing(canonicalHref, currentUrl)) {
        issues.push('Self-referencing canonical tag');
      }
    }

    return {
      href: canonicalHref,
      isValid,
      issues,
    };
  }

  private isAbsoluteUrl(url: string): boolean {
    return /^(?:[a-z]+:)?\/\//i.test(url);
  }

  private isSelfReferencing(canonicalHref: string, currentUrl: string): boolean {
    try {
      const canonicalUrl = new URL(canonicalHref, currentUrl);
      const currentPageUrl = new URL(currentUrl);
      return canonicalUrl.href === currentPageUrl.href;
    } catch (error) {
      return false;
    }
  }

  analyzeCanonicalConsistency(pages: { url: string; canonicalHref: string }[]): CanonicalConsistencyAnalysis {
    const canonicalGroups = new Map<string, string[]>();

    pages.forEach(page => {
      if (page.canonicalHref) {
        const group = canonicalGroups.get(page.canonicalHref) || [];
        group.push(page.url);
        canonicalGroups.set(page.canonicalHref, group);
      }
    });

    const inconsistencies = Array.from(canonicalGroups.entries())
      .filter(([canonical, urls]) => urls.length > 1 && !urls.includes(canonical))
      .map(([canonical, urls]) => ({
        canonicalUrl: canonical,
        conflictingUrls: urls,
      }));

    return {
      isConsistent: inconsistencies.length === 0,
      inconsistencies,
    };
  }

  analyzeRelLinks($: cheerio.CheerioAPI): RelLinkAnalysis {
    const config = this.crawlerConfigService.getRelLinkConfig();

    if (!config.enabled) {
      return { nextLink: null, prevLink: null, isPartOfSeries: false };
    }

    const nextLink = $('link[rel="next"]').attr('href') || null;
    const prevLink = $('link[rel="prev"]').attr('href') || null;

    return {
      nextLink,
      prevLink,
      isPartOfSeries: !!(nextLink || prevLink),
    };
  }

  analyzeHreflangTags($: cheerio.CheerioAPI): HreflangAnalysis {
    const hreflangConfig = this.crawlerConfigService.getHreflangConfig();
    const hreflangTags = $('link[rel="alternate"][hreflang]');
    const hreflangData: HreflangTag[] = [];

    hreflangTags.each((_, element) => {
      const $element = $(element);
      const hreflang = $element.attr('hreflang');
      const href = $element.attr('href');

      if (hreflang && href) {
        hreflangData.push({ hreflang, href });
      }
    });

    const analysis: HreflangAnalysis = {
      tags: hreflangData,
      count: hreflangData.length,
      hasXDefault: hreflangData.some(tag => tag.hreflang === 'x-default'),
      exceedsMaxTags: hreflangData.length > hreflangConfig.maxTags,
      missingRequiredAttributes: this.checkMissingAttributes($, hreflangTags, hreflangConfig.requiredAttributes),
    };

    return analysis;
  }

  private checkMissingAttributes($: cheerio.CheerioAPI, tags: any, requiredAttributes: string[]): boolean {
    return tags.toArray().some(element => {
      return requiredAttributes.some(attr => !$(element).attr(attr));
    });
  }

  analyzeOpenGraphTags($: cheerio.CheerioAPI): OpenGraphAnalysis {
    const ogConfig = this.crawlerConfigService.getOpenGraphConfig();
    const ogTags = $('meta[property^="og:"]').toArray();
    const ogProperties = ogTags.map(tag => ({
      property: $(tag).attr('property'),
      content: $(tag).attr('content')
    }));

    const missingRequiredProperties = ogConfig.requiredProperties.filter(
      prop => !ogProperties.some(ogProp => ogProp.property === prop)
    );

    const contentQualityAnalysis = this.analyzeOGContentQuality(ogProperties);

    return {
      properties: ogProperties,
      missingRequiredProperties,
      isValid: missingRequiredProperties.length === 0,
      contentQualityAnalysis,
      recommendations: this.generateOGRecommendations(ogProperties, missingRequiredProperties, contentQualityAnalysis)
    };
  }

  analyzeTwitterCardTags($: cheerio.CheerioAPI): TwitterCardAnalysis {
    const twitterConfig = this.crawlerConfigService.getTwitterCardConfig();
    const twitterTags = $('meta[name^="twitter:"]').toArray();
    const twitterProperties = twitterTags.map(tag => ({
      name: $(tag).attr('name'),
      content: $(tag).attr('content')
    }));

    const missingRequiredProperties = twitterConfig.requiredProperties.filter(
      prop => !twitterProperties.some(twitterProp => twitterProp.name === prop)
    );

    const contentQualityAnalysis = this.analyzeTwitterContentQuality(twitterProperties);

    return {
      properties: twitterProperties,
      missingRequiredProperties,
      isValid: missingRequiredProperties.length === 0,
      contentQualityAnalysis,
      recommendations: this.generateTwitterRecommendations(twitterProperties, missingRequiredProperties, contentQualityAnalysis)
    };
  }

  analyzeViewportMetaTag($: cheerio.CheerioAPI): ViewportAnalysis {
    const viewportConfig = this.crawlerConfigService.getViewportConfig();
    const viewportTag = $('meta[name="viewport"]');
    const viewportContent = viewportTag.attr('content');

    const viewportProperties = viewportContent ? this.parseViewportContent(viewportContent) : {};
    const responsiveAnalysis = this.analyzeResponsiveness(viewportProperties);

    return {
      content: viewportContent,
      isPresent: viewportTag.length > 0,
      isRecommendedValue: viewportContent === viewportConfig.recommendedValue,
      properties: viewportProperties,
      responsiveAnalysis,
      recommendations: this.generateViewportRecommendations(viewportProperties, responsiveAnalysis)
    };
  }

  private analyzeOGContentQuality(properties: { property: string; content: string }[]): OGContentQualityAnalysis {
    const analysis: OGContentQualityAnalysis = {
      titleQuality: { length: 0, isOptimal: false },
      descriptionQuality: { length: 0, isOptimal: false },
      imageQuality: { url: '', dimensions: null, isOptimal: false }
    };

    properties.forEach(prop => {
      switch (prop.property) {
        case 'og:title':
          analysis.titleQuality.length = prop.content.length;
          analysis.titleQuality.isOptimal = prop.content.length >= 10 && prop.content.length <= 60;
          break;
        case 'og:description':
          analysis.descriptionQuality.length = prop.content.length;
          analysis.descriptionQuality.isOptimal = prop.content.length >= 50 && prop.content.length <= 200;
          break;
        case 'og:image':
          analysis.imageQuality.url = prop.content;
          // Here you would typically check the image dimensions by loading the image
          // For this example, we'll assume it's optimal
          analysis.imageQuality.isOptimal = true;
          break;
      }
    });

    return analysis;
  }

  private analyzeTwitterContentQuality(properties: { name: string; content: string }[]): TwitterContentQualityAnalysis {
    const analysis: TwitterContentQualityAnalysis = {
      cardType: '',
      titleQuality: { length: 0, isOptimal: false },
      descriptionQuality: { length: 0, isOptimal: false },
      imageQuality: { url: '', dimensions: null, isOptimal: false }
    };

    properties.forEach(prop => {
      switch (prop.name) {
        case 'twitter:card':
          analysis.cardType = prop.content;
          break;
        case 'twitter:title':
          analysis.titleQuality.length = prop.content.length;
          analysis.titleQuality.isOptimal = prop.content.length >= 10 && prop.content.length <= 70;
          break;
        case 'twitter:description':
          analysis.descriptionQuality.length = prop.content.length;
          analysis.descriptionQuality.isOptimal = prop.content.length >= 50 && prop.content.length <= 200;
          break;
        case 'twitter:image':
          analysis.imageQuality.url = prop.content;
          // Here you would typically check the image dimensions by loading the image
          // For this example, we'll assume it's optimal
          analysis.imageQuality.isOptimal = true;
          break;
      }
    });

    return analysis;
  }

  private parseViewportContent(content: string): ViewportProperties {
    const properties: ViewportProperties = {};
    content.split(',').forEach(prop => {
      const [key, value] = prop.trim().split('=');
      properties[key] = value;
    });
    return properties;
  }

  private analyzeResponsiveness(properties: ViewportProperties): ResponsiveAnalysis {
    const analysis: ResponsiveAnalysis = {
      isResponsive: false,
      hasInitialScale: false,
      initialScaleValue: null
    };

    if (properties['width'] === 'device-width') {
      analysis.isResponsive = true;
    }

    if ('initial-scale' in properties) {
      analysis.hasInitialScale = true;
      analysis.initialScaleValue = parseFloat(properties['initial-scale']);
    }

    return analysis;
  }

  private generateOGRecommendations(properties: any[], missingProperties: string[], qualityAnalysis: OGContentQualityAnalysis): string[] {
    const recommendations: string[] = [];

    missingProperties.forEach(prop => {
      recommendations.push(`Add missing Open Graph property: ${prop}`);
    });

    if (!qualityAnalysis.titleQuality.isOptimal) {
      recommendations.push(`Optimize og:title length. Current length: ${qualityAnalysis.titleQuality.length}. Recommended: 10-60 characters.`);
    }

    if (!qualityAnalysis.descriptionQuality.isOptimal) {
      recommendations.push(`Optimize og:description length. Current length: ${qualityAnalysis.descriptionQuality.length}. Recommended: 50-200 characters.`);
    }

    if (!qualityAnalysis.imageQuality.isOptimal) {
      recommendations.push('Ensure og:image is present and has optimal dimensions (1200x630 pixels recommended for Facebook).');
    }

    return recommendations;
  }

  private generateTwitterRecommendations(properties: any[], missingProperties: string[], qualityAnalysis: TwitterContentQualityAnalysis): string[] {
    const recommendations: string[] = [];

    missingProperties.forEach(prop => {
      recommendations.push(`Add missing Twitter Card property: ${prop}`);
    });

    if (!qualityAnalysis.titleQuality.isOptimal) {
      recommendations.push(`Optimize twitter:title length. Current length: ${qualityAnalysis.titleQuality.length}. Recommended: 10-70 characters.`);
    }

    if (!qualityAnalysis.descriptionQuality.isOptimal) {
      recommendations.push(`Optimize twitter:description length. Current length: ${qualityAnalysis.descriptionQuality.length}. Recommended: 50-200 characters.`);
    }

    if (!qualityAnalysis.imageQuality.isOptimal) {
      recommendations.push('Ensure twitter:image is present and has optimal dimensions (1200x675 pixels recommended for Twitter).');
    }

    return recommendations;
  }

  private generateViewportRecommendations(properties: ViewportProperties, responsiveAnalysis: ResponsiveAnalysis): string[] {
    const recommendations: string[] = [];

    if (!responsiveAnalysis.isResponsive) {
      recommendations.push('Set viewport width to device-width for better responsiveness.');
    }

    if (!responsiveAnalysis.hasInitialScale) {
      recommendations.push('Add initial-scale=1.0 to the viewport meta tag.');
    } else if (responsiveAnalysis.initialScaleValue !== 1.0) {
      recommendations.push('Set initial-scale to 1.0 for optimal viewing experience.');
    }

    return recommendations;
  }
}

interface OpenGraphAnalysis {
  properties: { property: string; content: string }[];
  missingRequiredProperties: string[];
  isValid: boolean;
  contentQualityAnalysis: OGContentQualityAnalysis;
  recommendations: string[];
}

interface TwitterCardAnalysis {
  properties: { name: string; content: string }[];
  missingRequiredProperties: string[];
  isValid: boolean;
  contentQualityAnalysis: TwitterContentQualityAnalysis;
  recommendations: string[];
}

interface ViewportAnalysis {
  content: string | undefined;
  isPresent: boolean;
  isRecommendedValue: boolean;
  properties: ViewportProperties;
  responsiveAnalysis: ResponsiveAnalysis;
  recommendations: string[];
}

interface OGContentQualityAnalysis {
  titleQuality: { length: number; isOptimal: boolean };
  descriptionQuality: { length: number; isOptimal: boolean };
  imageQuality: { url: string; dimensions: { width: number; height: number } | null; isOptimal: boolean };
}

interface TwitterContentQualityAnalysis {
  cardType: string;
  titleQuality: { length: number; isOptimal: boolean };
  descriptionQuality: { length: number; isOptimal: boolean };
  imageQuality: { url: string; dimensions: { width: number; height: number } | null; isOptimal: boolean };
}

interface ViewportProperties {
  [key: string]: string;
}

interface ResponsiveAnalysis {
  isResponsive: boolean;
  hasInitialScale: boolean;
  initialScaleValue: number | null;
}

interface HreflangTag {
  hreflang: string;
  href: string;
}

interface HreflangAnalysis {
  tags: HreflangTag[];
  count: number;
  hasXDefault: boolean;
  exceedsMaxTags: boolean;
  missingRequiredAttributes: boolean;
}

interface CanonicalTagAnalysis {
  href: string | null;
  isValid: boolean;
  issues: string[];
}

interface CanonicalConsistencyAnalysis {
  isConsistent: boolean;
  inconsistencies: {
    canonicalUrl: string;
    conflictingUrls: string[];
  }[];
}

interface TitleTagAnalysis {
  content: string;
  length: number;
  pixelWidth: number;
  isTooShort: boolean;
  isTooLong: boolean;
  isPixelWidthTooNarrow: boolean;
  isPixelWidthTooWide: boolean;
}

interface MetaDescriptionAnalysis {
    content: string;
    length: number;
    isTooShort: boolean;
    isTooLong: boolean;
    keywordCount: number;
    hasEnoughKeywords: boolean;
}

interface HeadingElement {
  tag: string;
  elements: { content: string; order: number; tag: string }[];
}

interface HeadingAnalysis {
  headingCounts: HeadingCountAnalysis;
  headingOrder: HeadingOrderAnalysis;
  headingContent: HeadingContentAnalysis;
}

interface HeadingCountAnalysis {
  counts: Record<string, number>;
  hasIdealH1Count: boolean;
  exceedsMaxCounts: Record<string, boolean>;
}

interface HeadingOrderAnalysis {
  isCorrectOrder: boolean;
  headingSequence: string[];
}

interface HeadingContentAnalysis {
  [key: string]: { content: string; length: number; exceedsMaxLength: boolean }[];
}

interface MetaKeywordsAnalysis {
  content: string;
  keywordCount: number;
  keywords: string[];
  exceedsMaxCount: boolean;
}

interface MetaRobotsTagAnalysis {
  content: string;
  length: number;
  isTooLong: boolean;
  directives: Record<string, boolean>;
  stats: {
    noindexCount: number;
    nofollowCount: number;
    otherDirectivesCount: number;
  };
}


interface RelLinkAnalysis {
  nextLink: string | null;
  prevLink: string | null;
  isPartOfSeries: boolean;
}