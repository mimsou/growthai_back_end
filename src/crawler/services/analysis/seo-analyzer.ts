import * as cheerio from 'cheerio';
import { Injectable } from '@nestjs/common';
import { DirectoryTreeAnalyzer } from './directory-tree-analyzer';
 import { CrawlerConfigService } from '../../config/crawler-config.service';

@Injectable()
export class SEOAnalyzer {
  constructor(private readonly directoryTreeAnalyzer: DirectoryTreeAnalyzer, private readonly crawlerConfigService: CrawlerConfigService) {}

  calculateSEOScores($: cheerio.CheerioAPI, pageData: any): Record<string, number> {
    const scores: Record<string, number> = {};
  
    scores.performance = this.calculatePerformanceScore(pageData.loadTime);
    scores.content = this.calculateContentScore(pageData.mainContent);
    scores.seoBestPractices = this.calculateSEOBestPracticesScore($, pageData);
    scores.technicalSEO = this.calculateTechnicalSEOScore($, pageData);
    scores.userExperience = this.calculateUserExperienceScore($, pageData);
    scores.mobileFriendliness = this.calculateMobileFriendlinessScore($);
    scores.directoryStructure = this.calculateDirectoryStructureScore(pageData.directoryTree);
    
    return scores;
  }
  
  private calculatePerformanceScore(loadTime: number): number {
     return Math.min(100, Math.max(0, 100 - (loadTime - 1000) / 100));
  }

  calculateMetaRobotsTagScore(metaRobotsTagAnalysis: any): number {
    let score = 100;

    if (metaRobotsTagAnalysis.isTooLong) {
      score -= 20;
    }

    if (metaRobotsTagAnalysis.directives.noindex) {
      score -= 50;
    }

    if (metaRobotsTagAnalysis.directives.nofollow) {
      score -= 30;
    }

    return Math.max(0, score);
  }

  async calculateMetaKeywordsScore(metaKeywordsAnalysis: MetaKeywordsAnalysis, siteKeywords: string[] ): Promise<number> {
    if (!metaKeywordsAnalysis.content) {
      return 0;
    }
  
    let score = 100;
  
    // Analyze keyword count
    if (metaKeywordsAnalysis.keywordCount === 0) {
      score -= 50;
    } else if (metaKeywordsAnalysis.keywordCount < 3) {
      score -= 30;
    } else if (metaKeywordsAnalysis.keywordCount > 10) {
      score -= 20 + (metaKeywordsAnalysis.keywordCount - 10) * 2; // Penalize for each additional keyword over 10
    }
  
    // Analyze keyword relevance
    const matchingKeywords = metaKeywordsAnalysis.keywords.filter(keyword => siteKeywords.includes(keyword));
    const matchPercentage = (matchingKeywords.length / metaKeywordsAnalysis.keywords.length) * 100;
  
    if (matchPercentage < 30) {
      score -= 40;
    } else if (matchPercentage < 50) {
      score -= 30;
    } else if (matchPercentage < 75) {
      score -= 15;
    }
  
    // Analyze keyword length and quality
    const averageKeywordLength = metaKeywordsAnalysis.keywords.reduce((sum, keyword) => sum + keyword.length, 0) / metaKeywordsAnalysis.keywordCount;
    if (averageKeywordLength < 4) {
      score -= 20; // Penalize for very short keywords
    }
  
    // Check for duplicate keywords
    const uniqueKeywords = new Set(metaKeywordsAnalysis.keywords);
    if (uniqueKeywords.size < metaKeywordsAnalysis.keywordCount) {
      score -= 15; // Penalize for duplicate keywords
    }
  
    // Check for keyword stuffing
    const contentLowerCase = metaKeywordsAnalysis.content.toLowerCase();
    const keywordDensity = metaKeywordsAnalysis.keywords.reduce((sum, keyword) => {
      const regex = new RegExp(keyword.toLowerCase(), 'g');
      return sum + (contentLowerCase.match(regex) || []).length;
    }, 0) / metaKeywordsAnalysis.content.split(' ').length;
  
    if (keywordDensity > 0.1) {
      score -= 30; // Penalize for keyword stuffing
    }
  
    return Math.max(0, Math.min(100, score)); // Ensure score is between 0 and 100
  }
  
  private calculateContentScore(content: string): number {
    if (!content) return 0;
  
    const text = cheerio.load(content).text();
    const wordCount = text.split(/\s+/).length;
    const linkDensity = Math.min(1, (content.match(/<a /g) || []).length / wordCount);
    const headingDensity = Math.min(1, (content.match(/<h[1-6]/g) || []).length / wordCount);
    const paragraphDensity = Math.min(1, (content.match(/<p/g) || []).length / wordCount);
  
    let score = wordCount;
    score *= (1 - linkDensity);
    score *= (1 + headingDensity * 0.5);
    score *= (1 + paragraphDensity * 0.5);
  
    if (content.includes('<article')) score *= 1.2;
    if (content.includes('<section')) score *= 1.1;
    if (content.includes('<figure')) score *= 1.05;
  
    return 1 + 99 / (1 + Math.exp(-score / 1000));
  }

   calculateHeadingScore(headingAnalysis: any): number {
    let score = 100;
    if (!headingAnalysis.headingCounts.hasIdealH1Count) {
      score -= 20;
    }
  
    Object.values(headingAnalysis.headingCounts.exceedsMaxCounts).forEach((exceeds: boolean) => {
      if (exceeds) score -= 5;
    });
  
    if (!headingAnalysis.headingOrder.isCorrectOrder) {
      score -= 15;
    }
  
    Object.values(headingAnalysis.headingContent).flat().forEach((heading: any) => {
      if (heading.exceedsMaxLength) score -= 2;
    });
  
    return Math.max(0, score);
  }

  calculateRelLinkScore(relLinkAnalysis: any): number {
    if (!relLinkAnalysis) return 0;

    let score = 100;

    if (relLinkAnalysis.isPartOfSeries) {
      if (!relLinkAnalysis.nextLink && !relLinkAnalysis.prevLink) {
        score -= 50; // Penalize if part of a series but missing both next and prev links
      } else if (!relLinkAnalysis.nextLink || !relLinkAnalysis.prevLink) {
        score -= 25; // Minor penalty if only one of next or prev is missing
      }
    }

    return score;
  }
  
  private calculateSEOBestPracticesScore($: cheerio.CheerioAPI, pageData: any): number {
    let score = 100;
  
    if (!$('title').length) score -= 10;
    if (!$('meta[name="description"]').length) score -= 10;
    if (!$('h1').length) score -= 10;
    if ($('h2').length < 2) score -= 5;
  
    const imagesWithoutAlt = $('img:not([alt])').length;
    score -= imagesWithoutAlt * 2;
  
    const internalLinks = $('a[href^="/"], a[href^="' + pageData.urlStructure.hostname + '"]').length;
    if (internalLinks < 5) score -= 10;
  
    return Math.max(0, score);
  }
  
  private calculateTechnicalSEOScore($: cheerio.CheerioAPI, pageData: any): number {
    let score = 100;
  
    if (!$('link[rel="canonical"]').length) score -= 10;
    if (!pageData.sitemapPresent) score -= 10;
    if (!pageData.robotsTxtPresent) score -= 10;
    if (pageData.urlStructure.protocol !== 'https:') score -= 20;
    if (!$('meta[name="viewport"]').length) score -= 10;

    if (pageData.xRobotsTagAnalysis) {
      if (pageData.xRobotsTagAnalysis.present) {
        const directives = pageData.xRobotsTagAnalysis.directives;
        if (directives.noindex) {
          score -= 20; // Significant impact on SEO
        }
        if (directives.nofollow) {
          score -= 10;
        }
        if (directives.none) {
          score -= 30; // Most restrictive, highest impact
        }
        if (directives.noarchive || directives.nosnippet || directives.notranslate || directives.noimageindex) {
          score -= 5; // Minor impact for each of these directives
        }
        if (directives.unavailable_after) {
          const unavailableDate = new Date(directives.unavailable_after);
          if (unavailableDate > new Date()) {
            score -= 15; // Content will become unavailable in the future
          }
        }
        if (pageData.xRobotsTagAnalysis.exceedsMaxLength) {
          score -= 5; // Penalize for exceeding max length
        }
      }
    } else {
      score -= 5; // Minor penalty for not having X-Robots-Tag (it's optional but can be beneficial)
    }
  
    return Math.max(0, score);
  }
  
  private calculateUserExperienceScore($: cheerio.CheerioAPI, pageData: any): number {
    let score = 100;
  
    const readabilityScore = this.calculateReadabilityScore(pageData.mainContent);
    score -= Math.max(0, 20 - readabilityScore);
  
    if (!$('*:contains("contact"), *:contains("email"), *:contains("phone")').length) score -= 10;
    if (!$('a[href*="facebook"], a[href*="twitter"], a[href*="linkedin"], a[href*="instagram"]').length) score -= 10;
    if (!$('nav, #nav, .nav, #menu, .menu').length) score -= 10;
  
    return Math.max(0, score);
  }
  
  private calculateMobileFriendlinessScore($: cheerio.CheerioAPI): number {
    let score = 100;
  
    if (!$('meta[name="viewport"]').length) score -= 50;
  
    const smallButtons = $('button, .button, [role="button"]').filter((_, el) => {
      const width = $(el).css('width');
      const height = $(el).css('height');
      return (width && parseInt(width) < 44) || (height && parseInt(height) < 44);
    }).length;
    score -= smallButtons * 5;
  
    const smallFonts = $('*').filter((_, el) => {
      const fontSize = $(el).css('font-size');
      return fontSize && parseInt(fontSize) < 12;
    }).length;
    score -= smallFonts * 2;
  
    return Math.max(0, score);
  }
  
  private calculateReadabilityScore(content: string): number {
    const text = cheerio.load(content).text();
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const avgWordsPerSentence = words / sentences;
  
    return Math.max(0, 100 - Math.abs(avgWordsPerSentence - 15) * 5);
  }
      private calculateDirectoryStructureScore(directoryTree: any): number {
        if (!directoryTree) return 0;

        const analysis = this.directoryTreeAnalyzer.analyzeDirectoryTree(directoryTree);
        let score = 100;

        if ((analysis.maxDepth as number) > 5) score -= ((analysis.maxDepth as number) - 5) * 5;
        if ((analysis.averageFilesPerFolder as number) > 20) score -= ((analysis.averageFilesPerFolder as number) - 20) * 2;
        if ((analysis.totalFiles as number) > 1000) score -= 10;
        if ((analysis.totalFolders as number) > 100) score -= 10;

        const fileTypeVariety = Object.keys(analysis.fileTypeDistribution as Record<string, number>).length;
        if (fileTypeVariety < 3) score -= 10;
        if (fileTypeVariety > 10) score -= 5;

        return Math.max(0, score);
      }

      calculateTitleTagScore(titleTagAnalysis: TitleTagAnalysis): number {
        let score = 100;
        const config = this.crawlerConfigService.getTitleTagConfig();
    
        if (titleTagAnalysis.isTooShort) {
          score -= 20;
        } else if (titleTagAnalysis.isTooLong) {
          score -= 10;
        }
    
        if (titleTagAnalysis.isPixelWidthTooNarrow) {
          score -= 15;
        } else if (titleTagAnalysis.isPixelWidthTooWide) {
          score -= 15;
        }
    
        // Additional scoring criteria
        if (titleTagAnalysis.content.length < config.minLength / 2) {
          score -= 10; // Severely short title
        }
        if (titleTagAnalysis.content.length > config.maxLength * 1.5) {
          score -= 15; // Severely long title
        }
        if (!titleTagAnalysis.content.match(/[a-zA-Z]/)) {
          score -= 30; // Title doesn't contain any letters
        }
    
        return Math.max(0, Math.min(100, score));
      }


      calculateSecurityHeaderScore(securityHeaderAnalysis: SecurityHeaderAnalysis): number {
        if (!securityHeaderAnalysis.analyzed) {
          return 0;
        }
    
        let score = 100;
        const headers = securityHeaderAnalysis.headers;
    
        if (headers['X-XSS-Protection']) {
          score -= this.scoreXXSSProtection(headers['X-XSS-Protection'].value);
        }
        if (headers['X-Frame-Options']) {
          score -= this.scoreXFrameOptions(headers['X-Frame-Options'].value);
        }
        if (headers['Strict-Transport-Security']) {
          score -= this.scoreHSTS(headers['Strict-Transport-Security'].value);
        }
        if (headers['Content-Security-Policy']) {
          score -= this.scoreCSP(headers['Content-Security-Policy'].value);
        }
        if (headers['X-Content-Type-Options']) {
          score -= this.scoreXContentTypeOptions(headers['X-Content-Type-Options'].value);
        }
        if (headers['Referrer-Policy']) {
          score -= this.scoreReferrerPolicy(headers['Referrer-Policy'].value);
        }
    
        return Math.max(0, Math.min(100, score));
      }

      calculateWordCountScore(wordCount: number): number {
        const minWords = 300;
        const optimalWords = 1000;
        const maxWords = 2000;
      
        if (wordCount < minWords) {
          return (wordCount / minWords) * 100;
        } else if (wordCount <= optimalWords) {
          return 100;
        } else if (wordCount <= maxWords) {
          return 100 - ((wordCount - optimalWords) / (maxWords - optimalWords)) * 20;
        } else {
          return 80;
        }
      }

      calculateMetaDescriptionScore(metaDescriptionAnalysis: MetaDescriptionAnalysis): number {
        let score = 100;
        const config = this.crawlerConfigService.getMetaDescriptionConfig();
    
        if (metaDescriptionAnalysis.isTooShort) {
          score -= 20;
        } else if (metaDescriptionAnalysis.isTooLong) {
          score -= 10;
        }
    
        if (!metaDescriptionAnalysis.hasEnoughKeywords) {
          score -= 15;
        }
    
        // Additional scoring criteria
        if (metaDescriptionAnalysis.content.length < config.minLength / 2) {
          score -= 10; // Severely short meta description
        }
        if (metaDescriptionAnalysis.content.length > config.maxLength * 1.5) {
          score -= 15; // Severely long meta description
        }
        if (!metaDescriptionAnalysis.content.match(/[a-zA-Z]/)) {
          score -= 30; // Meta description doesn't contain any letters
        }
    
        return Math.max(0, Math.min(100, score));
      }
      
    
      private scoreXXSSProtection(value: string): number {
        return value === '1; mode=block' ? 0 : 10;
      }
    
      private scoreXFrameOptions(value: string): number {
        return ['DENY', 'SAMEORIGIN'].includes(value.toUpperCase()) ? 0 : 10;
      }
    
      private scoreHSTS(value: string): number {
        return value.includes('max-age=') && parseInt(value.split('max-age=')[1]) >= 31536000 ? 0 : 10;
      }
    
      private scoreCSP(value: string): number {
        return value ? 0 : 20; // Presence is good, but detailed analysis would be complex
      }
    
      private scoreXContentTypeOptions(value: string): number {
        return value.toLowerCase() === 'nosniff' ? 0 : 10;
      }
    
      private scoreReferrerPolicy(value: string): number {
        return ['no-referrer', 'strict-origin', 'strict-origin-when-cross-origin'].includes(value.toLowerCase()) ? 0 : 10;
      }

      calculateOpenGraphScore(analysis: OpenGraphAnalysis): number {
        let score = 0;
        if (analysis.isValid) score += 50;
        if (analysis.contentQualityAnalysis.titleQuality.isOptimal) score += 15;
        if (analysis.contentQualityAnalysis.descriptionQuality.isOptimal) score += 15;
        if (analysis.contentQualityAnalysis.imageQuality.isOptimal) score += 20;
        return score;
      }
      
      calculateTwitterCardScore(analysis: TwitterCardAnalysis): number {
        let score = 0;
        if (analysis.isValid) score += 50;
        if (analysis.contentQualityAnalysis.titleQuality.isOptimal) score += 15;
        if (analysis.contentQualityAnalysis.descriptionQuality.isOptimal) score += 15;
        if (analysis.contentQualityAnalysis.imageQuality.isOptimal) score += 20;
        return score;
      }
      
      calculateViewportScore(analysis: ViewportAnalysis): number {
        let score = 0;
        if (analysis.isPresent) score += 50;
        if (analysis.isRecommendedValue) score += 25;
        if (analysis.responsiveAnalysis.isResponsive) score += 25;
        return score;
      }

      calculateImageSEOScore(imageAnalysis: any[]): number {
        if (!imageAnalysis || imageAnalysis.length === 0) return 0;
    
        const totalImages = imageAnalysis.length;
        const imagesWithAlt = imageAnalysis.filter(img => img.altText.present).length;
        const imagesWithTitle = imageAnalysis.filter(img => img.titleAttribute.present).length;
        const optimizedImages = imageAnalysis.filter(img => img.seoAnalysis.fileSizeOptimized && img.seoAnalysis.dimensionsOptimal).length;
        const imagesWithoutTextIssues = imageAnalysis.filter(img => !img.seoAnalysis.textInImageIssue).length;
    
        const altTextScore = (imagesWithAlt / totalImages) * 100;
        const titleScore = (imagesWithTitle / totalImages) * 100;
        const optimizationScore = (optimizedImages / totalImages) * 100;
        const textIssueScore = (imagesWithoutTextIssues / totalImages) * 100;
    
        const overallScore = (altTextScore + titleScore + optimizationScore + textIssueScore) / 4;
        return Math.round(overallScore);
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

    interface SecurityHeaderAnalysis {
      analyzed: boolean;
      headers?: {
        [key: string]: {
          present: boolean;
          value: string;
        };
      };
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

interface MetaKeywordsAnalysis {
  content: string;
  keywordCount: number;
  keywords: string[];
  exceedsMaxCount: boolean;
}
