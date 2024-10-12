import * as cheerio from 'cheerio';
import { Injectable } from '@nestjs/common';
import { DirectoryTreeAnalyzer } from './directory-tree-analyzer';

@Injectable()
export class SEOAnalyzer {
  constructor(private readonly directoryTreeAnalyzer: DirectoryTreeAnalyzer) {}

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
    }