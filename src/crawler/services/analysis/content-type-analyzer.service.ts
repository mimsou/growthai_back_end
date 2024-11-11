import { Injectable } from '@nestjs/common';
import { CrawlerConfigService } from '../../config/crawler-config.service';
import * as mime from 'mime-types';

@Injectable()
export class ContentTypeAnalyzerService {
  constructor(private readonly crawlerConfigService: CrawlerConfigService) {}

  analyzeMimeType(contentType: string, url: string): MimeTypeAnalysis {
    const [mimeType] = contentType.split(';');
    const extension = this.getFileExtension(url);
    const detectedMimeType = mime.lookup(extension) || mimeType;

    return {
      declaredMimeType: mimeType,
      detectedMimeType,
      mimeTypeMatch: mimeType === detectedMimeType,
      fileExtension: extension,
    };
  }

  private getFileExtension(url: string): string {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const extension = pathname.split('.').pop() || '';
    return extension.toLowerCase();
  }
}

interface MimeTypeAnalysis {
  declaredMimeType: string;
  detectedMimeType: string;
  mimeTypeMatch: boolean;
  fileExtension: string;
}
