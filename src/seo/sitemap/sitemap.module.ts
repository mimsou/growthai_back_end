import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SitemapService } from './sitemap.service';
import { SitemapController } from './sitemap.controller';
import { SitemapData, SitemapDataSchema } from './sitemap-data.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: SitemapData.name, schema: SitemapDataSchema }])],
  controllers: [SitemapController],
  providers: [SitemapService],
  exports: [SitemapService],
})
export class SitemapModule {}
