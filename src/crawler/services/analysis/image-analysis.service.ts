
import { Injectable, Logger } from '@nestjs/common';
import { CrawlerConfigService } from '../../config/crawler-config.service';
import * as cheerio from 'cheerio';
import { AsyncHttpService } from '../async-http.service';
import * as probe from 'probe-image-size';
 

@Injectable()
export class ImageAnalysisService {
  private readonly logger = new Logger(ImageAnalysisService.name);
  private config: any;

  constructor(
    private readonly crawlerConfigService: CrawlerConfigService,
    private readonly asyncHttpService: AsyncHttpService
  ) {
    this.config = this.crawlerConfigService.getImageAnalysisConfig();
  }

  async analyzeImages($: cheerio.CheerioAPI, baseUrl: string,  keyWords:string[]): Promise<ImageAnalysisResult[]> {
    const images = $('img');
    const analysisPromises = images.map((_, img) => this.analyzeImage($(img), baseUrl,  keyWords)).get();
    return Promise.all(analysisPromises);
  }

  private async analyzeImage(image: any, baseUrl: string, keyWords:string[]): Promise<ImageAnalysisResult> {
    const src = this.getFullUrl(image.attr('src'), baseUrl);
    const alt = image.attr('alt');
    const title = image.attr('title');

    const result: ImageAnalysisResult = {
      url: src,
      altText: {
        present: !!alt,
        content: alt || '',
        length: (alt || '').length,
        keywordUsage: this.analyzeKeywordUsageInAltText(alt, keyWords),
      },
      titleAttribute: {
        present: !!title,
        content: title || '',
      },
      isBroken: false,
    };

    try {
      const probeResult = await probe(src);
      result.fileSize = probeResult.length;
      result.dimensions = { width: probeResult.width, height: probeResult.height };
      result.fileFormat = probeResult.mime;
      result.isBroken = false;

      this.analyzeImageSEO(result);
    } catch (error) {
      this.logger.error(`Error analyzing image ${src}: ${error.message}`);
      result.isBroken = true;
    }

    return result;
  }

  private getFullUrl(src: string, baseUrl: string): string {
    if (src.startsWith('http')) return src;
    return new URL(src, baseUrl).href;
  }

  private analyzeKeywordUsageInAltText(alt: string, keywords: string[]): number {
    if (!alt) return 0;
    return keywords.filter(keyword => alt.toLowerCase().includes(keyword.toLowerCase())).length;
  }

  private analyzeKeywordUsageInTitle(title: string, keywords: string[]): number {
    if (!title) return 0;
    return keywords.filter(keyword => title.toLowerCase().includes(keyword.toLowerCase())).length;
  }

  private analyzeImageSEO(result: ImageAnalysisResult): void {
    result.seoAnalysis = {
      altTextQuality: this.analyzeAltTextQuality(result.altText),
      fileSizeOptimized: result.fileSize <= this.config.maxSizeMB * 1024 * 1024,
      dimensionsOptimal: this.analyzeDimensions(result.dimensions),
      formatOptimal: this.analyzeFormat(result.fileFormat),
    };
  }

  private analyzeAltTextQuality(altText: AltTextAnalysis): string {
    if (!altText.present) return 'Missing alt text';
    if (altText.length < 5) return 'Alt text too short';
    if (altText.length > 125) return 'Alt text too long';
    if (altText.keywordUsage === 0) return 'No relevant keywords in alt text';
    return 'Good';
  }

  private analyzeDimensions(dimensions: ImageDimensions): boolean {
    return dimensions.width >= this.config.minWidth && dimensions.height >= this.config.minHeight;
  }

  private analyzeFormat(format: string): boolean {
    return this.config.allowedFormats.includes(format.split('/')[1]);
  }


}

interface ImageAnalysisResult {
  url: string;
  altText: AltTextAnalysis;
  titleAttribute: {
    present: boolean;
    content: string;
  };
  fileSize?: number;
  dimensions?: ImageDimensions;
  fileFormat?: string;
  isBroken: boolean;
  textInImage?: TextInImageResult;
  seoAnalysis?: ImageSEOAnalysis;
}

interface AltTextAnalysis {
  present: boolean;
  content: string;
  length: number;
  keywordUsage: number;
}

interface ImageDimensions {
  width: number;
  height: number;
}

interface TextInImageResult {
  hasText: boolean;
  text: string;
  confidence: number;
}

interface ImageSEOAnalysis {
  altTextQuality: string;
  fileSizeOptimized: boolean;
  dimensionsOptimal: boolean;
  formatOptimal: boolean;
}
