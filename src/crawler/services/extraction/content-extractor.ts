import * as cheerio from 'cheerio';
import axios from 'axios';

export class ContentExtractor {
  async fetchPage(url: string): Promise<{ $: cheerio.CheerioAPI; loadTime: number }> {
    const startTime = Date.now();
    const response = await axios.get(url);
    const loadTime = Date.now() - startTime;
    const $ = cheerio.load(response.data);
    return { $, loadTime };
  }

  extractPageData($: cheerio.CheerioAPI, url: string, loadTime: number): any {
    const { bestContent, goodContent, contentScore } = this.extractMainContent($);

    return {
      pageTitle: $('title').text(),
      pageUrlRelative: new URL(url).pathname,
      pageMetaData: this.extractMetadata($),
      imageData: this.extractImageData($),
      mainContent: bestContent,
      goodContent: goodContent,
      contentScore: contentScore,
      wordCount: this.countWords($('body').text()),
      loadTime,
      urlStructure: this.analyzeUrlStructure(url),
      brandingElements: this.detectBrandingElements($),
      structuredData: this.extractStructuredData($),
    };
  }

  private extractMetadata($: cheerio.CheerioAPI): Record<string, string> {
    const metadata: Record<string, string> = {};
    $('meta').each((_, el) => {
      const name = $(el).attr('name') || $(el).attr('property');
      const content = $(el).attr('content');
      if (name && content) {
        metadata[name] = content;
      }
    });
    metadata['canonical'] = $('link[rel="canonical"]').attr('href') || '';
    $('link[rel="alternate"][hreflang]').each((_, el) => {
      const hreflang = $(el).attr('hreflang');
      const href = $(el).attr('href');
      if (hreflang && href) {
        metadata[`hreflang:${hreflang}`] = href;
      }
    });
    return metadata;
  }

  private extractImageData($: cheerio.CheerioAPI): any[] {
    return $('img').map((_, el) => ({
        src: $(el).attr('src'),
        alt: $(el).attr('alt'),
        title: $(el).attr('title'),
        width: $(el).attr('width'),
        height: $(el).attr('height'),
      })).get();
  }

  private extractMainContent($: cheerio.CheerioAPI): { bestContent: string; goodContent: string[]; contentScore: number } {
    const contentSelectors = [
        'article', 'main', '#content', '.content', '.post-content',
        '[role="main"]', '.entry-content', '.post', '.article'
      ];
    
      let bestContent = '';
      let bestScore = 0;
      let goodContent: string[] = [];
    
      // Try common content selectors first
      for (const selector of contentSelectors) {
        const $content = $(selector);
        if ($content.length) {
          const content = $content.first().html();
          const score = this.calculateContentScore(content);
          if (score > bestScore) {
            if (bestContent) {
              goodContent.push(bestContent);
            }
            bestContent = content;
            bestScore = score;
          } else if (score > bestScore * 0.7) {
            goodContent.push(content);
          }
        }
      }
    
      // If no suitable content found, analyze all top-level elements
      if (!bestContent) {
        $('body > *').each((_, element) => {
          const $element = $(element);
          const content = $element.html();
          const score = this.calculateContentScore(content);
          if (score > bestScore) {
            if (bestContent) {
              goodContent.push(bestContent);
            }
            bestContent = content;
            bestScore = score;
          } else if (score > bestScore * 0.7) {
            goodContent.push(content);
          }
        });
      }
    
      // If still no content, fallback to body
      if (!bestContent) {
        bestContent = $('body').html();
        bestScore = this.calculateContentScore(bestContent);
      }
    
      return { bestContent, goodContent, contentScore: bestScore };
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
  
    // Apply activation function to keep score between 1 and 100
    return 1 + 99 / (1 + Math.exp(-score / 1000));
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  private analyzeUrlStructure(url: string): Record<string, string> {
    const parsedUrl = new URL(url);
    return {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      pathname: parsedUrl.pathname,
      search: parsedUrl.search,
      hash: parsedUrl.hash,
    };
  }

  private detectBrandingElements($: cheerio.CheerioAPI): Record<string, boolean> {
    return {
        hasReviews: $('*:contains("review"), *:contains("testimonial")').length > 0,
        hasChatbot: $('*:contains("chat"), *[id*="chat"], *[class*="chat"]').length > 0,
        hasAboutUs: $('a[href*="about"], *:contains("About Us")').length > 0,
        hasMediaSection: $('*:contains("Media"), a[href*="media"], a[href*="press"]').length > 0,
        hasProjectsSection: $('*:contains("Projects"), a[href*="project"], a[href*="portfolio"]').length > 0,
      };
  }

  private extractStructuredData($: cheerio.CheerioAPI): string[] {
    return $('script[type="application/ld+json"]')
    .map((_, el) => $(el).html())
    .get();
  }
}
