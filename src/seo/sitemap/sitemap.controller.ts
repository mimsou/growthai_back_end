import { Controller, Get, Query } from '@nestjs/common';
import { SitemapService } from './sitemap.service';

@Controller('seo/sitemap')
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  @Get()
  async getSitemapData(@Query('url') url: string, @Query('auditId') auditId: string) {
    return this.sitemapService.analyzeSitemap(url, auditId);
  }
}