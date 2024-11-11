import { Injectable, Logger } from '@nestjs/common';
import { CrawlerConfigService } from '../../config/crawler-config.service';
import * as cheerio from 'cheerio';

@Injectable()
export class JavaRenderingScriptAnalysisService {
  private readonly logger = new Logger(JavaRenderingScriptAnalysisService.name);

  constructor(private readonly crawlerConfigService: CrawlerConfigService) {}

  analyzeRenderedVsNonRendered(nonRenderedHtml: string, renderedHtml: string): RenderedVsNonRenderedAnalysis {

    if(!!this.crawlerConfigService.getJavaScriptRenderingConfig().enabled){
      return null;
    }

    const $nonRendered = cheerio.load(nonRenderedHtml);
    const $rendered = cheerio.load(renderedHtml);

    return {
      contentDifference: this.analyzeContentDifference($nonRendered, $rendered),
      dynamicElements: this.analyzeDynamicElements($nonRendered, $rendered),
      seoImpact: this.analyzeSEOImpact($nonRendered, $rendered),
    };
  }

  private analyzeContentDifference($nonRendered: cheerio.CheerioAPI, $rendered: cheerio.CheerioAPI): ContentDifferenceAnalysis {
    const nonRenderedText = $nonRendered('body').text().trim();
    const renderedText = $rendered('body').text().trim();

    return {
      textLengthDifference: renderedText.length - nonRenderedText.length,
      wordCountDifference: this.countWords(renderedText) - this.countWords(nonRenderedText),
      newHeadings: this.analyzeNewHeadings($nonRendered, $rendered),
      newParagraphs: this.countNewElements($nonRendered, $rendered, 'p'),
      newImages: this.analyzeNewImages($nonRendered, $rendered),
      newLinks: this.analyzeNewLinks($nonRendered, $rendered),
    };
  }

  private analyzeDynamicElements($nonRendered: cheerio.CheerioAPI, $rendered: cheerio.CheerioAPI): DynamicElementsAnalysis {
    return {
      lazyLoadedImages: this.analyzeLazyLoadedImages($nonRendered, $rendered),
      infiniteScroll: this.detectInfiniteScroll($rendered),
      dynamicTabs: this.detectDynamicTabs($rendered),
      ajaxForms: this.detectAjaxForms($rendered),
    };
  }

  private analyzeSEOImpact($nonRendered: cheerio.CheerioAPI, $rendered: cheerio.CheerioAPI): SEOImpactAnalysis {
    return {
      titleChange: this.compareTitles($nonRendered, $rendered),
      metaDescriptionChange: this.compareMetaDescriptions($nonRendered, $rendered),
      canonicalUrlChange: this.compareCanonicalUrls($nonRendered, $rendered),
      structuredDataChange: this.compareStructuredData($nonRendered, $rendered),
      hreflangChange: this.compareHreflang($nonRendered, $rendered),
    };
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private analyzeNewHeadings($nonRendered: cheerio.CheerioAPI, $rendered: cheerio.CheerioAPI): NewHeadingsAnalysis {
    const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    const result: NewHeadingsAnalysis = {};

    headings.forEach(tag => {
      const nonRenderedHeadings = new Set($nonRendered(tag).map((_, el) => $nonRendered(el).text()).get());
      const renderedHeadings = $rendered(tag).map((_, el) => $rendered(el).text()).get();
      result[tag] = renderedHeadings.filter(heading => !nonRenderedHeadings.has(heading));
    });

    return result;
  }

  private countNewElements($nonRendered: cheerio.CheerioAPI, $rendered: cheerio.CheerioAPI, selector: string): number {
    return $rendered(selector).length - $nonRendered(selector).length;
  }

  private analyzeNewImages($nonRendered: cheerio.CheerioAPI, $rendered: cheerio.CheerioAPI): NewImagesAnalysis {
    const nonRenderedImages = new Set($nonRendered('img').map((_, el) => $nonRendered(el).attr('src')).get());
    const renderedImages = $rendered('img').map((_, el) => ({
      src: $rendered(el).attr('src') || '',
      alt: $rendered(el).attr('alt') || '',
    })).get();
  
    return {
      newImages: renderedImages.filter(img => !nonRenderedImages.has(img.src))
    };
  }

  private analyzeNewLinks($nonRendered: cheerio.CheerioAPI, $rendered: cheerio.CheerioAPI): NewLinksAnalysis {
    const nonRenderedLinks = new Set($nonRendered('a').map((_, el) => $nonRendered(el).attr('href')).get());
    const renderedLinks = $rendered('a').map((_, el) => ({
      href: $rendered(el).attr('href') || '',
      text: $rendered(el).text(),
    })).get();
  
    return {
      newLinks: renderedLinks.filter(link => !nonRenderedLinks.has(link.href))
    };
  }
  private analyzeLazyLoadedImages($nonRendered: cheerio.CheerioAPI, $rendered: cheerio.CheerioAPI): LazyLoadedImagesAnalysis {
    const nonRenderedImages = new Set($nonRendered('img').map((_, el) => $nonRendered(el).attr('src')).get());
    const renderedImages = $rendered('img').map((_, el) => $rendered(el).attr('src')).get();

    return {
      count: renderedImages.filter(src => !nonRenderedImages.has(src)).length,
      urls: renderedImages.filter(src => !nonRenderedImages.has(src)),
    };
  }

  private detectInfiniteScroll($rendered: cheerio.CheerioAPI): boolean {
    // This is a simplified check. In reality, you'd need to analyze the page's JavaScript.
    return $rendered('[data-infinite-scroll]').length > 0 || $rendered('.infinite-scroll').length > 0;
  }

  private detectDynamicTabs($rendered: cheerio.CheerioAPI): boolean {
    return $rendered('.tab-content').length > 0 || $rendered('[role="tabpanel"]').length > 0;
  }

  private detectAjaxForms($rendered: cheerio.CheerioAPI): boolean {
    return $rendered('form[data-remote="true"]').length > 0 || $rendered('form.ajax-form').length > 0;
  }

  private compareTitles($nonRendered: cheerio.CheerioAPI, $rendered: cheerio.CheerioAPI): TitleChangeAnalysis {
    const nonRenderedTitle = $nonRendered('title').text();
    const renderedTitle = $rendered('title').text();

    return {
      changed: nonRenderedTitle !== renderedTitle,
      original: nonRenderedTitle,
      rendered: renderedTitle,
    };
  }

  private compareMetaDescriptions($nonRendered: cheerio.CheerioAPI, $rendered: cheerio.CheerioAPI): MetaDescriptionChangeAnalysis {
    const nonRenderedDesc = $nonRendered('meta[name="description"]').attr('content');
    const renderedDesc = $rendered('meta[name="description"]').attr('content');

    return {
      changed: nonRenderedDesc !== renderedDesc,
      original: nonRenderedDesc,
      rendered: renderedDesc,
    };
  }

  private compareCanonicalUrls($nonRendered: cheerio.CheerioAPI, $rendered: cheerio.CheerioAPI): CanonicalUrlChangeAnalysis {
    const nonRenderedCanonical = $nonRendered('link[rel="canonical"]').attr('href');
    const renderedCanonical = $rendered('link[rel="canonical"]').attr('href');

    return {
      changed: nonRenderedCanonical !== renderedCanonical,
      original: nonRenderedCanonical,
      rendered: renderedCanonical,
    };
  }

  private compareStructuredData($nonRendered: cheerio.CheerioAPI, $rendered: cheerio.CheerioAPI): StructuredDataChangeAnalysis {
    const nonRenderedData = this.extractStructuredData($nonRendered);
    const renderedData = this.extractStructuredData($rendered);

    return {
      changed: JSON.stringify(nonRenderedData) !== JSON.stringify(renderedData),
      original: nonRenderedData,
      rendered: renderedData,
    };
  }

  private extractStructuredData($: cheerio.CheerioAPI): any[] {
    return $('script[type="application/ld+json"]')
      .map((_, el) => {
        try {
          return JSON.parse($(el).html() || '');
        } catch (error) {
          this.logger.warn(`Error parsing structured data: ${error.message}`);
          return null;
        }
      })
      .get()
      .filter(data => data !== null);
  }

  private compareHreflang($nonRendered: cheerio.CheerioAPI, $rendered: cheerio.CheerioAPI): HreflangChangeAnalysis {
    const nonRenderedHreflang = this.extractHreflang($nonRendered);
    const renderedHreflang = this.extractHreflang($rendered);

    return {
      changed: JSON.stringify(nonRenderedHreflang) !== JSON.stringify(renderedHreflang),
      original: nonRenderedHreflang,
      rendered: renderedHreflang,
    };
  }

  private extractHreflang($: cheerio.CheerioAPI): HreflangEntry[] {
    return $('link[rel="alternate"][hreflang]')
      .map((_, el) => ({
        hreflang: $(el).attr('hreflang'),
        href: $(el).attr('href'),
      }))
      .get();
  }
}

interface RenderedVsNonRenderedAnalysis {
  contentDifference: ContentDifferenceAnalysis;
  dynamicElements: DynamicElementsAnalysis;
  seoImpact: SEOImpactAnalysis;
}

interface ContentDifferenceAnalysis {
  textLengthDifference: number;
  wordCountDifference: number;
  newHeadings: NewHeadingsAnalysis;
  newParagraphs: number;
  newImages: NewImagesAnalysis;
  newLinks: NewLinksAnalysis;
}

interface NewHeadingsAnalysis {
  [key: string]: string[];
}

interface NewImagesAnalysis {
    newImages: { src: string; alt: string }[];
  }
  
  interface NewLinksAnalysis {
    newLinks: { href: string; text: string }[];
  }

interface DynamicElementsAnalysis {
  lazyLoadedImages: LazyLoadedImagesAnalysis;
  infiniteScroll: boolean;
  dynamicTabs: boolean;
  ajaxForms: boolean;
}

interface LazyLoadedImagesAnalysis {
  count: number;
  urls: string[];
}

interface SEOImpactAnalysis {
  titleChange: TitleChangeAnalysis;
  metaDescriptionChange: MetaDescriptionChangeAnalysis;
  canonicalUrlChange: CanonicalUrlChangeAnalysis;
  structuredDataChange: StructuredDataChangeAnalysis;
  hreflangChange: HreflangChangeAnalysis;
}

interface TitleChangeAnalysis {
  changed: boolean;
  original: string | undefined;
  rendered: string | undefined;
}

interface MetaDescriptionChangeAnalysis {
  changed: boolean;
  original: string | undefined;
  rendered: string | undefined;
}

interface CanonicalUrlChangeAnalysis {
  changed: boolean;
  original: string | undefined;
  rendered: string | undefined;
}

interface StructuredDataChangeAnalysis {
  changed: boolean;
  original: any[];
  rendered: any[];
}

interface HreflangChangeAnalysis {
  changed: boolean;
  original: HreflangEntry[];
  rendered: HreflangEntry[];
}

interface HreflangEntry {
  hreflang: string | undefined;
  href: string | undefined;
}