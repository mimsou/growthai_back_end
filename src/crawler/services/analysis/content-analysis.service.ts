import { Injectable } from '@nestjs/common';
import { CrawlerConfigService } from '../../config/crawler-config.service';
import * as langdetect from 'langdetect';
import * as cheerio from 'cheerio';
import * as sjs from 'simhash-js';
import * as syllable from 'syllable';

@Injectable()
export class ContentAnalysisService {
  private simhash: any;
  constructor(private readonly crawlerConfigService: CrawlerConfigService) {
    this.simhash = new sjs.SimHash();
  }

  calculateContentToHtmlRatio($: cheerio.CheerioAPI): number {
    const htmlSize = $.html().length;
    const textContent = $.text().trim();
    const contentSize = textContent.length;
    return contentSize / htmlSize;
  }
 
  generateContentHash(content: string): number {
    return this.simhash.hash(content);
  }

  extractTextContent($: cheerio.CheerioAPI): string {
    $('script, style, iframe').remove();
    return $('body').text().replace(/\s{2,}/g, ' ') 
    .replace(/\n{2,}/g, '\n')
    .trim();
  }

  countSentences(text: string): number {
    return text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0).length;
  }

  countParagraphs($: cheerio.CheerioAPI): number {
    return $('p').length;
  }


  private countSyllables(text: string): number {
    return text.toLowerCase().split(/\s+/).reduce((count, word) => {
      return count + word.replace(/[^aeiouy]/g, '').length;
    }, 0);
  }

  extractTopKeywords(text: string): { [key: string]: number } {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const wordCounts: { [key: string]: number } = {};
    words.forEach((word: string) => {
      if (word.length > 3) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });
    return Object.fromEntries(
      Object.entries(wordCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
    );
  }
  
  countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }


  detectLanguage($: cheerio.CheerioAPI): string {
    const textContent = $('body').text();
    const { confidenceThreshold } = this.crawlerConfigService.getContentAnalysisConfig().languageDetection;
    const detection = langdetect.detect(textContent);
    if (detection && detection.length > 0) {
      const [detectedLang, confidence] = [detection[0].lang, detection[0].prob];
      return confidence >= confidenceThreshold ? detectedLang : 'und';
    }
    
    return 'und';
  }

  calculateKeywordDensity($: cheerio.CheerioAPI, keywords: string[]): Record<string, number> {
    const config = this.crawlerConfigService.getKeywordAnalysisConfig();
    const words =  $('body').text().toLowerCase().split(/\s+/);
    const totalWords = words.length;
    const keywordDensity: Record<string, number> = {};

    keywords.forEach(keyword => {
      const keywordCount = words.filter(word => word === keyword.toLowerCase()).length;
      const density = (keywordCount / totalWords) * 100;
      if (density >= config.densityThreshold) {
        keywordDensity[keyword] = parseFloat(density.toFixed(2));
      }
    });

    return keywordDensity;
  }

  analyzeKeywordUsage($: cheerio.CheerioAPI, keywords: string[]): Record<string, number> {
    const config = this.crawlerConfigService.getKeywordAnalysisConfig();
    const words = $('body').text().split(/\s+/);
    const keywordUsage: Record<string, number> = {};

    keywords.forEach(keyword => {
      const keywordCount = words.filter(word => word === keyword.toLowerCase()).length;
      if (keywordCount >= config.usageMinCount && keywordCount <= config.usageMaxCount) {
        keywordUsage[keyword] = keywordCount;
      }
    });

    return keywordUsage;
  }

  analyzeThinContent(html: string): ThinContentAnalysis {
    const $ = cheerio.load(html);
    const fullText = $('body').text();
    const mainContent = this.extractMainContent($);
    const { wordThreshold, charThreshold } = this.crawlerConfigService.getThinContentConfig();

    const wordCount = this.countWords(mainContent);
    const charCount = mainContent.length;
    const contentToHtmlRatio = this.calculateContentToHtmlRatioForThinContent(html, fullText);

    return {
      isThinContent: wordCount < wordThreshold || charCount < charThreshold,
      wordCount,
      charCount,
      contentDensity: charCount / wordCount,
      contentToHtmlRatio,
      specificElementsAnalysis: this.analyzeSpecificElements($),
      mainContentWordCount: this.countWords(mainContent),
      fullPageWordCount: this.countWords(fullText),
    };
  }

  private analyzeSpecificElements($: cheerio.CheerioAPI): SpecificElementsAnalysis {
    return {
      hasMain: $('main').length > 0,
      hasArticle: $('article').length > 0,
      hasContentWrapper: $('.content, #content').length > 0,
    };
  }

  private calculateContentToHtmlRatioForThinContent(html: string, text: string): number {
    const htmlLength = html.length;
    const textLength = text.length;
    return textLength / htmlLength;
  }

  private extractMainContent($: cheerio.CheerioAPI): string {
    const mainSelectors = ['main', 'article', '.content', '#content'];
    for (const selector of mainSelectors) {
      const element = $(selector);
      if (element.length) {
        return element.text();
      }
    }
    return $('body').text();
  }
  calculateReadabilityScore(content: string): ReadabilityAnalysis {
    const sentences = this.countSentences(content);
    const words = this.countWords(content);
    const syllables = this.countSyllables(content);

    const fleschKincaid = this.calculateFleschKincaid(sentences, words, syllables);
    const automatedReadability = this.calculateAutomatedReadabilityIndex(sentences, words, content);
    const colemanLiau = this.calculateColemanLiauIndex(sentences, words, content);

    return {
      fleschKincaidGrade: fleschKincaid,
      automatedReadabilityIndex: automatedReadability,
      colemanLiauIndex: colemanLiau,
      averageGradeLevel: (fleschKincaid + automatedReadability + colemanLiau) / 3,
      sentenceCount: sentences,
      wordCount: words,
      syllableCount: syllables,
      averageWordLength: content.length / words,
      averageSyllablesPerWord: syllables / words,
      averageWordsPerSentence: words / sentences,
    };
  }

  private calculateFleschKincaid(sentences: number, words: number, syllables: number): number {
    return 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
  }

  private calculateAutomatedReadabilityIndex(sentences: number, words: number, content: string): number {
    const characters = content.replace(/\s/g, '').length;
    return 4.71 * (characters / words) + 0.5 * (words / sentences) - 21.43;
  }

  private calculateColemanLiauIndex(sentences: number, words: number, content: string): number {
    const characters = content.replace(/\s/g, '').length;
    const L = (characters / words) * 100;
    const S = (sentences / words) * 100;
    return 0.0588 * L - 0.296 * S - 15.8;
  }

}


interface ThinContentAnalysis {
  isThinContent: boolean;
  wordCount: number;
  charCount: number;
  contentDensity: number;
  contentToHtmlRatio: number;
  specificElementsAnalysis: SpecificElementsAnalysis;
  mainContentWordCount: number;
  fullPageWordCount: number;
}

interface SpecificElementsAnalysis {
  hasMain: boolean;
  hasArticle: boolean;
  hasContentWrapper: boolean;
}

interface ReadabilityAnalysis {
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
}
