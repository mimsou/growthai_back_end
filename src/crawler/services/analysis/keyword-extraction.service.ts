import { Injectable } from '@nestjs/common';
import { CrawlerConfigService } from '../../config/crawler-config.service';
import * as natural from 'natural';
import * as sw from 'stopword';

@Injectable()
export class KeywordExtractionService {
  private tokenizer: natural.WordTokenizer;
  private config: KeywordExtractionConfig;

  constructor(private crawlerConfigService: CrawlerConfigService) {
    this.tokenizer = new natural.WordTokenizer();
    this.config = this.crawlerConfigService.getKeywordExtractionConfig();
  }

  extractKeywords(text: string): string[] {
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    const filteredTokens = tokens.filter(token => token.length >= this.config.minWordLength);
    
    const tfidf = new natural.TfIdf();
    tfidf.addDocument(filteredTokens);

    const keywordScores = filteredTokens.map(token => ({
      word: token,
      score: tfidf.tfidf(token, 0)
    }));

    const sortedKeywords = keywordScores
      .sort((a, b) => b.score - a.score)
      .filter(item => item.score >= this.config.minOccurrence)
      .slice(0, this.config.maxKeywords);

    return sortedKeywords.map(item => item.word);
  }

  identifyImportantTerms(text: string, language: string = 'en'): string[] {
     
     if (!text || !language) {
       return [];
     }

     text = this.extractTextFromHtml(text);

    const tokens = this.tokenizer.tokenize(text.toLowerCase());

    const filteredTokens = sw.removeStopwords(tokens, sw[language]);

    const ngrams = this.generateNgrams(filteredTokens, 3);
    const tfidf = new natural.TfIdf();
    tfidf.addDocument(ngrams);

    const termScores = ngrams.map(term => ({
      term,
      score: tfidf.tfidf(term, 0)
    }));

    const sortedTerms = termScores
      .sort((a, b) => b.score - a.score)
      .filter(item => item.score >= this.config.minOccurrence)
      .slice(0, this.config.maxKeywords);
      
    return sortedTerms.map(item => item.term);
  }

  private generateNgrams(tokens: string[], maxGram: number): string[] {
    let ngrams: string[] = [];
    for (let n = 1; n <= maxGram; n++) {
      for (let i = 0; i <= tokens.length - n; i++) {
        ngrams.push(tokens.slice(i, i + n).join(' '));
      }
    }
    return ngrams;
  }

  extractTextFromHtml(html: string): string {
    const cheerio = require('cheerio');
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style').remove();
    
    // Get the text content
    let text = $('body').text();
    
    // Remove extra whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }

}



interface KeywordExtractionConfig {
    minWordLength: number;
    maxKeywords: number;
    minOccurrence: number;
  }
